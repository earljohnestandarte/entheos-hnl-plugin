import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { analyzeDocuments, isSafeExportName, looksLikeCodeChecklist, sheetIdentifier } from '@hnl/core';
import { LIMITS, type CheckSummary, type DocumentRecord, type FileKind, type Finding } from '@hnl/contracts';
import { readPdf, UnsupportedPdfError } from '../lib/pdf';
import type { SourceDocument } from '../lib/export';
import { isOmittedReference } from '../lib/handoffFiles';
import { fileVerificationKey } from '../lib/exportNames';

export type Item = SourceDocument & { demo: boolean; syntheticSample: boolean; manualKind?: boolean };

const SUPPORTING_NAME_PATTERN = /\b(?:support(?:ing)?|forms?|escp|rswmp|checklist|attachment|letter|application|tpr|otr|survey|report|calc|spec|manual)\b/i;
const PLAN_SHEET_PREFIX = /^(?:00[01]|[a-z]{0,2}\d{3})\b/i;
const PLAN_HEADING = /\b(?:title sheet|drawing set|(?:floor|roof|site|plot|foundation|demolition|framing) plans?|(?:building|interior|exterior) (?:elevations?|sections?))\b/i;
type FileChoice = FileKind | 'reference';

function inferInitialKind(filename: string): FileKind {
  return SUPPORTING_NAME_PATTERN.test(filename) ? 'supporting' : 'plan';
}

type FileSuggestion = Pick<DocumentRecord, 'kind' | 'disposition' | 'kindReason' | 'typeReview'>;

function suggestFileType(filename: string, pages: DocumentRecord['pages']): FileSuggestion {
  if (looksLikeCodeChecklist(pages)) {
    return { kind: 'supporting', disposition: 'reference', kindReason: 'CivCheck checklist header detected.' };
  }
  const supportingName = SUPPORTING_NAME_PATTERN.test(filename);
  const planSignal = PLAN_SHEET_PREFIX.test(filename) || PLAN_HEADING.test(filename.replaceAll('_', ' ')) ||
    pages.some(({ text }) => text.split('\n', 5).some((line) => PLAN_HEADING.test(line)));
  const smallPages = pages.length > 0 && pages.every(({ widthInches, heightInches }) => Math.max(widthInches, heightInches) <= 18);
  const drawingPages = pages.some(({ widthInches, heightInches }) =>
    Math.min(widthInches, heightInches) >= 18 && Math.max(widthInches, heightInches) >= 24);
  if (supportingName && (planSignal || (pages.length > 1 && drawingPages))) {
    return { kind: 'plan', kindReason: 'The pages look like drawings.',
      typeReview: 'The filename suggests a supporting document while the pages look like drawings.' };
  }
  if (planSignal) return { kind: 'plan', kindReason: 'A plan sheet number or drawing heading was detected.' };
  if (supportingName || smallPages) return { kind: 'supporting', kindReason: supportingName
    ? 'The filename suggests a supporting document.' : 'The pages are document-sized.' };
  return { kind: 'plan', kindReason: 'Suggested as a plan for review.',
    typeReview: 'The filename and page content do not clearly identify this PDF.' };
}

async function inspectFile(item: Item, signal: AbortSignal): Promise<DocumentRecord> {
  const { record } = item;
  try {
    const result = await readPdf(item.file, signal);
    return { ...record, ...result, ...suggestFileType(record.originalName, result.pages), status: 'complete' };
  } catch (failure) {
    const unsupported = failure instanceof UnsupportedPdfError;
    return { ...record, status: unsupported ? 'unsupported' : 'error', pages: [],
      error: unsupported ? failure.message : 'The PDF could not be fully read. Re-export it from the source application; this file has not been assessed.' };
  }
}

export interface PreparationSession {
  items: Item[];
  summary: CheckSummary;
  busy: boolean;
  working: boolean;
  exporting: boolean;
  notice: string;
  error: string;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  addFiles: (files: File[], demo?: boolean) => Promise<void>;
  loadDemo: () => Promise<boolean>;
  correctDemo: (id: string) => Promise<void>;
  replaceFile: (id: string, file: File) => Promise<void>;
  remove: (id: string) => void;
  removedName?: string;
  undoRemove: () => Promise<void>;
  replacingId: string | null;
  cancelReplacement: () => void;
  clearFeedback: () => void;
  clear: () => void;
  exportPackage: () => Promise<void>;
  rename: (id: string, name: string) => void;
  classify: (id: string, kind: FileChoice) => void;
  omitReference: (id: string) => void;
  verifiedFindingIds: string[];
  toggleFindingVerified: (findingId: string) => void;
  setFindingsVerified: (findingIds: string[], verified: boolean) => void;
  verifiedFileKeys: Record<string, string>;
  verifyFile: (id: string) => void;
  resolvedFixes: Finding[];
}

const DEFAULT_PROJECT_NAME = 'My preparation set';

function fixFindingKey(finding: Pick<Finding, 'ruleId' | 'fileId'>): string {
  return JSON.stringify([finding.ruleId, finding.fileId ?? null]);
}

export function usePreparationSession(): PreparationSession {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const generation = useRef(0);
  const operation = useRef<symbol | null>(null);
  const mounted = useRef(true);
  const exportingRef = useRef(false);
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ item: Item; index: number } | null>(null);
  const [verifiedFindingIds, setVerifiedFindingIds] = useState<string[]>([]);
  const [verifiedFileKeys, setVerifiedFileKeys] = useState<Record<string, string>>({});
  const [seenFixMap, setSeenFixMap] = useState<Record<string, Finding>>({});
  const summary = useMemo(() => analyzeDocuments(items.map((item) => item.record)), [items]);

  useEffect(() => {
    if (items.length === 0) {
      setSeenFixMap((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    const activeIds = new Set(items.map((item) => item.record.id));
    const currentFixes = summary.findings.filter((finding) => finding.category === 'fix');
    setSeenFixMap((previous) => {
      let changed = false;
      const next: Record<string, Finding> = {};
      for (const [key, finding] of Object.entries(previous)) {
        if (!finding.fileId || activeIds.has(finding.fileId)) {
          next[key] = finding;
        } else {
          changed = true;
        }
      }
      for (const finding of currentFixes) {
        const key = fixFindingKey(finding);
        if (!next[key] || next[key].id !== finding.id) {
          next[key] = finding;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [items, summary]);

  const resolvedFixes = useMemo(() => {
    if (!items.length) return [];
    const activeIds = new Set(items.map((item) => item.record.id));
    const activeFixKeys = new Set(
      summary.findings.filter((finding) => finding.category === 'fix').map(fixFindingKey),
    );
    return Object.entries(seenFixMap)
      .filter(([key, finding]) => !activeFixKeys.has(key) && (!finding.fileId || activeIds.has(finding.fileId)))
      .map(([, finding]) => finding);
  }, [items, summary, seenFixMap]);

  function changeItems(update: (previous: Item[]) => Item[]): void {
    if (!mounted.current) return;
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }

  function isActive(epoch: number, token: symbol): boolean {
    return mounted.current && generation.current === epoch && operation.current === token;
  }

  useEffect(() => {
    mounted.current = true;
    const warn = (event: BeforeUnloadEvent): void => {
      if (itemsRef.current.length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      mounted.current = false;
      generation.current++;
      operation.current = null;
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
    };
  }, []);

  async function analyze(item: Item, epoch: number): Promise<void> {
    const controller = new AbortController();
    controllers.current.set(item.record.id, controller);
    try {
      const record = await inspectFile(item, controller.signal);
      if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return;
      changeItems((previous) => previous.map((entry) => entry.record.id === item.record.id && entry.record.revision === item.record.revision
        ? { ...entry, record } : entry));
    } finally {
      if (controllers.current.get(item.record.id) === controller) controllers.current.delete(item.record.id);
    }
  }

  async function addFilesWithOperation(files: File[], demo = false, heldOperation?: symbol): Promise<boolean> {
    if (!mounted.current || !files.length || exportingRef.current || (operation.current !== null && operation.current !== heldOperation)) return false;
    setError(''); setNotice('');
    const current = itemsRef.current;
    if (current.length + files.length > LIMITS.maxFiles) { setError('This prototype supports up to 20 files. Remove a file before adding more.'); return false; }
    if (files.some((file) => file.size > LIMITS.maxFileBytes)) { setError('Each file must be 25 MB or smaller. No files from this selection were added.'); return false; }
    if (current.reduce((sum, item) => sum + item.file.size, 0) + files.reduce((sum, file) => sum + file.size, 0) > LIMITS.maxTotalBytes) { setError('The preparation set must be 100 MB or smaller. No files from this selection were added.'); return false; }
    const token = heldOperation ?? Symbol('add');
    operation.current = token;
    const epoch = generation.current;
    const additions: Item[] = files.map((file) => ({ file, demo, syntheticSample: demo, record: { id: crypto.randomUUID(), revision: 1, originalName: file.name, exportName: file.name, kind: inferInitialKind(file.name), bytes: file.size, hash: '', status: 'analyzing', pages: [] } }));
    changeItems((previous) => [...previous, ...additions]);
    setWorking(true);
    try {
      for (const item of additions) {
        if (!isActive(epoch, token)) break;
        if (itemsRef.current.some((entry) => entry.record.id === item.record.id)) await analyze(item, epoch);
      }
      if (!isActive(epoch, token)) return false;
      setNotice('File analysis finished. Review classification, findings, and the checks we do not assess.');
      return true;
    } finally {
      if (isActive(epoch, token)) { operation.current = null; setWorking(false); }
    }
  }

  async function addFiles(files: File[], demo = false): Promise<void> {
    await addFilesWithOperation(files, demo);
  }

  async function replaceFileWithOperation(id: string, file: File, heldOperation?: symbol, syntheticSample = false): Promise<void> {
    const previous = itemsRef.current.find((item) => item.record.id === id);
    if (!mounted.current || !previous || exportingRef.current || (operation.current !== null && operation.current !== heldOperation)) return;
    setError(''); setNotice('');
    if (file.size > LIMITS.maxFileBytes || itemsRef.current.reduce((sum, item) => sum + item.file.size, 0) - previous.file.size + file.size > LIMITS.maxTotalBytes) { setError('Replacement exceeds the prototype file or set size limit. The previous revision is still in the workspace.'); return; }
    const token = heldOperation ?? Symbol('replace');
    operation.current = token;
    const original = previous.record;
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const candidate: Item = { ...previous, file, syntheticSample, manualKind: undefined, record: {
      id, revision: original.revision + 1, originalName: file.name, exportName: file.name,
      kind: inferInitialKind(file.name), bytes: file.size, pages: [], hash: '', status: 'analyzing',
    } };
    setWorking(true); setReplacingId(id);
    const epoch = generation.current;
    try {
      const record = await inspectFile(candidate, controller.signal);
      if (!isActive(epoch, token) || !itemsRef.current.some((item) => item === previous)) return;
      if (controller.signal.aborted) {
        setNotice('Replacement canceled. The previous revision is still in the workspace.');
        return;
      }
      if (record.status !== 'complete') {
        setError(`Replacement could not be used. ${record.error ?? 'Try another PDF.'} The previous revision is still in the workspace.`);
        return;
      }
      const oldSheet = sheetIdentifier(original.originalName);
      const newSheet = sheetIdentifier(file.name);
      const sameIdentity = oldSheet && newSheet ? oldSheet === newSheet
        : original.originalName.toLowerCase() === file.name.toLowerCase();
      const changedRole = record.kind !== original.kind ||
        (record.disposition ?? 'source') !== (original.disposition ?? 'source');
      const changedSheet = oldSheet !== newSheet && (original.kind === 'plan' || record.kind === 'plan');
      // Keep a manually selected reference when the same document has no contradictory plan cues.
      if (!record.typeReview && sameIdentity && previous.manualKind && original.disposition === 'reference' &&
        record.kind === 'supporting' && record.disposition !== 'reference') {
        record.disposition = 'reference';
      } else if (changedSheet || changedRole) {
        record.typeReview ??= 'The replacement suggests a different sheet identifier or file role. Confirm its type before packaging.';
      }
      const retainedName = sameIdentity && isSafeExportName(original.exportName);
      if (retainedName) record.exportName = original.exportName;
      const replacement = { ...candidate, record, manualKind: previous.manualKind && sameIdentity && !record.typeReview };
      changeItems((all) => all.map((item) => item === previous ? replacement : item));
      setNotice(retainedName && original.exportName !== file.name
        ? `Replacement analyzed. Kept the accepted export name ${original.exportName}.`
        : record.exportName !== original.exportName
          ? `Replacement analyzed. Review the current export name ${record.exportName}.`
          : 'Replacement analyzed. File checks and all set-level findings were recalculated.');
    } finally {
      if (controllers.current.get(id) === controller) controllers.current.delete(id);
      if (isActive(epoch, token)) { operation.current = null; setReplacingId(null); setWorking(false); }
    }
  }

  async function replaceFile(id: string, file: File): Promise<void> {
    await replaceFileWithOperation(id, file);
  }

  async function loadDemo(): Promise<boolean> {
    if (!mounted.current || operation.current || exportingRef.current) return false;
    const token = Symbol('sample');
    const epoch = generation.current;
    operation.current = token; setWorking(true); setError('');
    try {
      const { createDemoFiles } = await import('../lib/demo');
      if (!isActive(epoch, token)) return false;
      const files = await createDemoFiles();
      if (!isActive(epoch, token)) return false;
      return await addFilesWithOperation(files, true, token);
    } catch {
      if (isActive(epoch, token)) setError('The synthetic demo could not be generated. Please try again.');
      return false;
    } finally {
      if (isActive(epoch, token)) { operation.current = null; setWorking(false); }
    }
  }

  async function correctDemo(id: string): Promise<void> {
    if (!mounted.current || operation.current || exportingRef.current) return;
    const revision = itemsRef.current.find((item) => item.record.id === id)?.record.revision;
    if (revision === undefined) return;
    const token = Symbol('correct-sample');
    const epoch = generation.current;
    operation.current = token; setWorking(true);
    try {
      const { createCorrectedPlan } = await import('../lib/demo');
      if (!isActive(epoch, token)) return;
      const file = await createCorrectedPlan();
      if (!isActive(epoch, token) || itemsRef.current.find((item) => item.record.id === id)?.record.revision !== revision) return;
      await replaceFileWithOperation(id, file, token, true);
    } catch {
      if (isActive(epoch, token)) setError('The corrected synthetic PDF could not be generated.');
    } finally {
      if (isActive(epoch, token)) { operation.current = null; setWorking(false); }
    }
  }

  function remove(id: string): void {
    if (!mounted.current || exportingRef.current) return;
    const index = itemsRef.current.findIndex((item) => item.record.id === id);
    if (index < 0) return;
    setRemoved({ item: itemsRef.current[index], index });
    controllers.current.get(id)?.abort();
    changeItems((all) => all.filter((item) => item.record.id !== id));
    setError('');
    setNotice('File removed. Set-level checks updated.');
  }

  async function undoRemove(): Promise<void> {
    if (!mounted.current || !removed || operation.current || exportingRef.current) return;
    const { item, index } = removed;
    const current = itemsRef.current;
    if (current.some((entry) => entry.record.id === item.record.id)) return;
    if (current.length >= LIMITS.maxFiles || current.reduce((sum, entry) => sum + entry.file.size, 0) + item.file.size > LIMITS.maxTotalBytes) {
      setError('Remove another file to stay within the workspace limits, then try Undo remove again.');
      return;
    }
    changeItems((all) => [...all.slice(0, index), item, ...all.slice(index)]);
    setRemoved(null); setError('');
    setNotice('File restored. Set-level checks updated.');
    if (item.record.status !== 'analyzing') return;
    const token = Symbol('restore');
    const epoch = generation.current;
    operation.current = token; setWorking(true);
    try {
      await analyze(item, epoch);
    } finally {
      if (isActive(epoch, token)) { operation.current = null; setWorking(false); }
    }
  }

  function cancelReplacement(): void {
    if (replacingId) controllers.current.get(replacingId)?.abort();
  }

  function clearFeedback(): void {
    if (!mounted.current) return;
    setError('');
    setNotice('');
  }

  function clear(): void {
    if (!mounted.current) return;
    generation.current++;
    operation.current = null;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    exportingRef.current = false;
    changeItems(() => []);
    setRemoved(null); setReplacingId(null);
    setVerifiedFindingIds([]);
    setVerifiedFileKeys({});
    setSeenFixMap({});
    setProjectName(DEFAULT_PROJECT_NAME);
    setWorking(false); setExporting(false); setError('');
    setNotice('Session cleared. Downloaded copies, if any, are not deleted.');
  }

  async function exportPackage(): Promise<void> {
    if (!mounted.current || operation.current || exportingRef.current) return;
    const token = Symbol('export');
    const epoch = generation.current;
    operation.current = token;
    exportingRef.current = true;
    setExporting(true); setError(''); setNotice('');
    const snapshot: SourceDocument[] = itemsRef.current.map(({ file, record, syntheticSample }) => ({
      file, syntheticSample, record: { ...record, pages: record.pages.map((page) => ({ ...page })) },
    }));
    const syntheticDemo = snapshot.some((source) => source.syntheticSample && !isOmittedReference(source.record));
    try {
      const { buildPackage, downloadBytes } = await import('../lib/export');
      if (!isActive(epoch, token)) return;
      // The exporter validates every snapshot record and verifies the original source bytes.
      const findings = analyzeDocuments(snapshot.map((item) => item.record)).findings;
      const bytes = await buildPackage(projectName, snapshot, findings);
      if (!isActive(epoch, token)) return;
      downloadBytes(bytes, syntheticDemo ? 'HNL-preflight-sample-test-only.zip' : 'HNL-preflight-test-only.zip', 'application/zip');
      setNotice('Package downloaded. Extract the ZIP to rehearse the handoff locally.');
    } catch (failure) {
      if (isActive(epoch, token)) setError(failure instanceof Error ? failure.message : 'The package could not be created.');
    } finally {
      if (isActive(epoch, token)) {
        operation.current = null;
        exportingRef.current = false;
        setExporting(false);
      }
    }
  }

  function rename(id: string, name: string): void {
    if (!mounted.current || operation.current || exportingRef.current) return;
    changeItems((all) => all.map((item) => item.record.id === id ? { ...item, record: { ...item.record, exportName: name } } : item));
  }

  function classify(id: string, choice: FileChoice): void {
    if (!mounted.current || operation.current || exportingRef.current) return;
    changeItems((all) => all.map((item) => item.record.id === id ? {
      ...item, manualKind: true,
      record: { ...item.record, kind: choice === 'reference' ? 'supporting' : choice,
        disposition: choice === 'reference' ? 'reference' : 'source', typeReview: undefined,
        kindReason: 'Confirmed by you.', omitFromPackage: undefined },
    } : item));
  }

  function omitReference(id: string): void {
    if (!mounted.current || operation.current || exportingRef.current) return;
    changeItems((all) => all.map((item) => {
      const { record } = item;
      if (record.id !== id || record.disposition !== 'reference' ||
        (record.status !== 'unsupported' && record.status !== 'error')) return item;
      return { ...item, record: { ...record, omitFromPackage: !record.omitFromPackage } };
    }));
  }

  function toggleFindingVerified(findingId: string): void {
    if (!mounted.current) return;
    setVerifiedFindingIds((current) =>
      current.includes(findingId) ? current.filter((id) => id !== findingId) : [...current, findingId]);
  }

  function setFindingsVerified(findingIds: string[], verified: boolean): void {
    if (!mounted.current || !findingIds.length) return;
    setVerifiedFindingIds((current) => {
      const next = new Set(current);
      for (const id of findingIds) {
        if (verified) next.add(id);
        else next.delete(id);
      }
      return [...next];
    });
  }

  function verifyFile(id: string): void {
    if (!mounted.current) return;
    const item = itemsRef.current.find((entry) => entry.record.id === id);
    if (!item) return;
    setVerifiedFileKeys((current) => ({ ...current, [id]: fileVerificationKey(item.record) }));
  }

  return {
    items, summary, busy: working || exporting, working, exporting, notice, error,
    projectName, setProjectName, addFiles, loadDemo, correctDemo, replaceFile,
    remove, removedName: removed?.item.record.exportName, undoRemove, replacingId, cancelReplacement, clearFeedback,
    clear, exportPackage, rename, classify, omitReference,
    verifiedFindingIds, toggleFindingVerified, setFindingsVerified, verifiedFileKeys, verifyFile, resolvedFixes,
  };
}
