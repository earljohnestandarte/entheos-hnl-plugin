import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { analyzeDocuments } from '@hnl/core';
import { LIMITS, type CheckSummary, type FileKind } from '@hnl/contracts';
import { readPdf, UnsupportedPdfError } from '../lib/pdf';
import type { SourceDocument } from '../lib/export';

export type Item = SourceDocument & { demo: boolean; syntheticSample: boolean; manualKind?: boolean };

const SUPPORTING_NAME_PATTERN = /\b(?:support(?:ing)?|forms?|escp|rswmp|checklist|attachment|letter|application|tpr|otr|survey|report|calc|spec|manual)\b/i;
const PLAN_SHEET_PREFIX = /^(?:00[01]|[a-z]{0,2}\d{3})\b/i;

function inferInitialKind(filename: string): FileKind {
  return SUPPORTING_NAME_PATTERN.test(filename) ? 'supporting' : 'plan';
}

function refineKindFromPages(
  currentKind: FileKind,
  filename: string,
  pages: Array<{ widthInches: number; heightInches: number; text: string }>,
): FileKind {
  if (pages.length === 0) return currentKind;
  if (SUPPORTING_NAME_PATTERN.test(filename)) return 'supporting';
  const combinedText = pages.map((page) => page.text).join('\n');
  if (/\bREVIEW\s+TYPE\b[\s\S]{0,60}\bCHECKLIST\s+SUMMARY\b/i.test(combinedText)) return 'supporting';
  if (!PLAN_SHEET_PREFIX.test(filename) && (pages.length > 1 || Math.max(pages[0].widthInches, pages[0].heightInches) <= 18)) {
    return 'supporting';
  }
  return currentKind;
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
  clear: () => void;
  exportPackage: () => Promise<void>;
  rename: (id: string, name: string) => void;
  classify: (id: string, kind: FileKind) => void;
}

const DEFAULT_PROJECT_NAME = 'My preparation set';

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
  const summary = useMemo(() => analyzeDocuments(items.map((item) => item.record)), [items]);

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
      const result = await readPdf(item.file, controller.signal);
      if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return;
      changeItems((previous) => previous.map((entry) => entry.record.id === item.record.id && entry.record.revision === item.record.revision
        ? {
          ...entry,
          record: {
            ...entry.record,
            ...result,
            kind: entry.manualKind ? entry.record.kind : refineKindFromPages(entry.record.kind, entry.record.originalName, result.pages),
            status: 'complete',
          },
        }
        : entry));
    } catch (failure) {
      if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return;
      const unsupported = failure instanceof UnsupportedPdfError;
      changeItems((previous) => previous.map((entry) => entry.record.id === item.record.id && entry.record.revision === item.record.revision
        ? { ...entry, record: { ...entry.record, status: unsupported ? 'unsupported' : 'error', error: unsupported ? failure.message : 'The PDF could not be fully read. Re-export it from the source application; this file has not been assessed.', pages: [] } } : entry));
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
    if (file.size > LIMITS.maxFileBytes || itemsRef.current.reduce((sum, item) => sum + item.file.size, 0) - previous.file.size + file.size > LIMITS.maxTotalBytes) { setError('Replacement exceeds the prototype file or set size limit.'); return; }
    const token = heldOperation ?? Symbol('replace');
    operation.current = token;
    setError(''); setNotice('');
    controllers.current.get(id)?.abort();
    const replacement: Item = { ...previous, file, syntheticSample, record: { ...previous.record, revision: previous.record.revision + 1, originalName: file.name, exportName: file.name, bytes: file.size, pages: [], hash: '', status: 'analyzing', error: undefined } };
    changeItems((all) => all.map((item) => item.record.id === id ? replacement : item));
    setWorking(true);
    const epoch = generation.current;
    try {
      await analyze(replacement, epoch);
      if (isActive(epoch, token)) setNotice('Replacement analyzed. File checks and all set-level findings were recalculated.');
    } finally {
      if (isActive(epoch, token)) { operation.current = null; setWorking(false); }
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
    controllers.current.get(id)?.abort();
    changeItems((all) => all.filter((item) => item.record.id !== id));
    setNotice('File removed. Set-level checks updated.');
  }

  function clear(): void {
    if (!mounted.current) return;
    generation.current++;
    operation.current = null;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    exportingRef.current = false;
    changeItems(() => []);
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
    const syntheticDemo = snapshot.some((source) => source.syntheticSample);
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

  function classify(id: string, kind: FileKind): void {
    if (!mounted.current || operation.current || exportingRef.current) return;
    changeItems((all) => all.map((item) => item.record.id === id ? { ...item, manualKind: true, record: { ...item.record, kind } } : item));
  }

  return {
    items, summary, busy: working || exporting, working, exporting, notice, error,
    projectName, setProjectName, addFiles, loadDemo, correctDemo, replaceFile,
    remove, clear, exportPackage, rename, classify,
  };
}
