import { DEMO_RULE_PACK, type DocumentRecord, type Finding } from '@hnl/contracts';
import { csvCell } from '@hnl/core';
import { strToU8, zipSync } from 'fflate';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { handoffFiles, packageBlockers, packagePath } from './handoffFiles';

export interface SourceDocument {
  record: DocumentRecord;
  file: File;
  syntheticSample?: boolean;
}

const DEMO_LABEL = 'SYNTHETIC-DEMO PACKAGE - TEST-ONLY';
const TEST_LABEL = 'LOCAL PREPARATION PACKAGE - TEST-ONLY';
const DISCLAIMER = 'Preparation reference only. Unresolved fixes and manual reviews may remain. This package does not establish completeness, code compliance, permit approval, or readiness for submission.';
const EXPORT_PACK = { id: 'hnl-preparation-export', version: '2.0.0' } as const;
const SCHEMA_VERSION = 3;

export interface BuildPackageOptions {
  syntheticDemo?: boolean;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 verification requires Web Crypto in a secure context.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validateRecord(record: DocumentRecord, file: File): void {
  if (record.status !== 'complete') {
    throw new Error(`Every source must have complete analysis; ${record.originalName} is ${record.status}.`);
  }
  if (!record.id || !Number.isSafeInteger(record.revision) || record.revision < 1) {
    throw new Error('Every source requires an ID and a positive file revision.');
  }
  if (record.kind !== 'plan' && record.kind !== 'supporting') {
    throw new Error(`Invalid source kind for ${record.originalName}.`);
  }
  if (file.name !== record.originalName) {
    throw new Error(`Original filename no longer matches the analyzed source: ${record.originalName}.`);
  }
  if (!Number.isSafeInteger(record.bytes) || record.bytes <= 0 || record.bytes !== file.size) {
    throw new Error(`Source byte count no longer matches the analyzed record: ${record.originalName}.`);
  }
  if (!/^[a-f\d]{64}$/i.test(record.hash)) {
    throw new Error(`A real SHA-256 hash is required for ${record.originalName}.`);
  }
  if (!Array.isArray(record.pages) || record.pages.length === 0 || record.pages.some((page, index) => (
    page.page !== index + 1
    || !Number.isFinite(page.widthInches) || page.widthInches <= 0
    || !Number.isFinite(page.heightInches) || page.heightInches <= 0
    || !Number.isFinite(page.rotation)
    || typeof page.text !== 'string'
  ))) {
    throw new Error(`Complete page analysis is required for ${record.originalName}.`);
  }
}

function findingFileName(finding: Finding, documents: DocumentRecord[]): string {
  return documents.find((record) => record.id === finding.fileId)?.exportName ?? '';
}

function findingsCsv(documents: DocumentRecord[], findings: Finding[], label: string): string {
  const columns = ['packageLabel', 'id', 'ruleId', 'category', 'title', 'detail', 'action', 'source', 'fileId', 'fileName', 'page', 'revision'];
  const rows = findings.map((finding) => [
    label, finding.id, finding.ruleId, finding.category, finding.title, finding.detail,
    finding.action, finding.source, finding.fileId ?? '', findingFileName(finding, documents),
    finding.page === undefined ? '' : String(finding.page),
    finding.revision === undefined ? '' : String(finding.revision),
  ]);
  // Every cell, including filenames and rule text, goes through the shared
  // formula-injection protection and CSV escaping utility.
  return [columns, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\r\n') + '\r\n';
}

function guide(documents: DocumentRecord[], findings: Finding[], label: string, omitted: DocumentRecord[]): string {
  const fixes = findings.filter((finding) => finding.category === 'fix').length;
  const manual = findings.filter((finding) => finding.category === 'review' || finding.category === 'not-assessed').length;
  return [
    label,
    DISCLAIMER,
    `Unresolved findings: ${fixes} fix; ${manual} manual review/not assessed. Zero findings is not proof of compliance.`,
    '',
    'PACKAGE CONTENTS',
    'upload/plan/: unchanged source PDF bytes, with the selected export filenames.',
    'upload/supporting/: unchanged supporting PDF bytes, with the selected export filenames.',
    'reference/source-pdfs/: original review-only PDFs for local reference.',
    'reference/: guide, findings CSV, manifest JSON, and readiness PDF. These are local reference reports, NOT upload candidates.',
    'The manifest distinguishes generated sample files from user-supplied test files. All sources are for local testing.',
    '',
    'CIVCHECK HANDOFF PRACTICE',
    '1. Extract the ZIP locally. Keep the ZIP, test PDFs, and reference reports out of CivCheck and HNL Build.',
    '2. Rehearse file order and Plan/Other classification using the individual PDFs in the test set.',
    '3. Use the on-screen checklist to verify suggested document types, page ranges, and title-block evidence.',
    '4. Review unresolved items before ending the exercise. This app creates no CivCheck ID, certificate of completion, or CivCheck-watermarked plans.',
    '',
    'REFERENCE LIMITATIONS',
    `Demo rule pack: ${DEMO_RULE_PACK.id} ${DEMO_RULE_PACK.version}.`,
    `Authority: ${DEMO_RULE_PACK.authority}`,
    `Basis: ${DEMO_RULE_PACK.source}`,
    'No external network or app persistence is used by this export. Keep downloaded files secure.',
    'The PDF uses a restricted display alphabet. The manifest and CSV retain finding text. Full extracted page text stays in the browser workspace.',
    '',
    'SOURCE FILE MAP (original -> exported path; no portal assignments implied)',
    ...documents.map((record) => `${JSON.stringify(record.originalName)} -> ${JSON.stringify(packagePath(record))}; revision ${record.revision}; SHA-256 ${record.hash.toLowerCase()}`),
    ...omitted.map((record) => `Omitted unreadable reference: ${JSON.stringify(record.originalName)}; revision ${record.revision}.`),
    '',
  ].join('\n');
}

/** Standard PDF fonts cannot encode arbitrary Unicode; never feed them raw user text. */
function reportText(value: string): string {
  const limit = 12_000;
  const truncated = value.length > limit;
  const clean = value.slice(0, limit).normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\r\n\t\u0000-\u001f\u007f]/g, ' ')
    .replace(/[^\x20-\x7e]/gu, '?');
  return clean + (truncated ? ' [Truncated in PDF; see manifest/CSV for full text.]' : '');
}

function wrapText(value: string, font: PDFFont, size: number, width: number): string[] {
  // Character-level measurement also splits unbroken names, URLs and hashes.
  // Accumulating glyph widths avoids repeatedly measuring ever-longer strings.
  const lines: string[] = [];
  let line = '';
  let lineWidth = 0;
  for (const character of reportText(value)) {
    const glyphWidth = font.widthOfTextAtSize(character, size);
    if (line && lineWidth + glyphWidth > width) {
      const space = line.lastIndexOf(' ');
      if (space >= 0) {
        lines.push(line.slice(0, space + 1));
        line = line.slice(space + 1);
        lineWidth = font.widthOfTextAtSize(line, size);
      } else {
        lines.push(line);
        line = '';
        lineWidth = 0;
      }
    }
    line += character;
    lineWidth += glyphWidth;
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
}

async function readinessReport(
  projectName: string,
  documents: DocumentRecord[],
  findings: Finding[],
  exportedAt: string,
  projectRevision: string,
  label: string,
  syntheticDemo: boolean,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(syntheticDemo ? 'Synthetic-demo preparation reference - not compliance' : 'Local preparation reference - not compliance');
  pdf.setAuthor('EntheosIT Preflight');
  pdf.setCreator(`HNL preparation export ${EXPORT_PACK.version}`);
  pdf.setSubject('Reference only; not an upload document, certificate, or approval.');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 716;
  let abbreviated = false;
  const maxPages = 200;
  const paragraph = (value: string, heading = false) => {
    if (abbreviated) return;
    const face = heading ? bold : font;
    const size = heading ? 12 : 10;
    const lines = wrapText(value, face, size, 516);
    if (heading && y < 100 && pdf.getPageCount() < maxPages) {
      page = pdf.addPage([612, 792]);
      y = 716;
    }
    for (const line of lines) {
      if (y < 72) {
        if (pdf.getPageCount() >= maxPages) {
          abbreviated = true;
          return;
        }
        page = pdf.addPage([612, 792]);
        y = 716;
      }
      page.drawText(line, { x: 48, y, size, font: face, color: rgb(0.12, 0.15, 0.18) });
      y -= 15;
    }
    y -= heading ? 8 : 6;
  };

  paragraph('Preparation reference - NOT a compliance report', true);
  paragraph(DISCLAIMER);
  paragraph(`Project: ${projectName}`);
  paragraph(`Exported (UTC): ${exportedAt}`);
  paragraph(`Project revision fingerprint (not a persisted counter): ${projectRevision}`);
  paragraph(`Demo rule pack: ${DEMO_RULE_PACK.id} ${DEMO_RULE_PACK.version}; export pack: ${EXPORT_PACK.version}.`);
  paragraph(DEMO_RULE_PACK.authority);
  paragraph('Display note: unsupported Unicode is replaced with ?, controls with spaces, and long fields may be abbreviated. See manifest.json and findings.csv for finding text.');
  const { included, omitted } = handoffFiles(documents);
  paragraph(`Packaged PDFs: ${included.length}; omitted references: ${omitted.length}; findings: ${findings.length}; fix: ${findings.filter((item) => item.category === 'fix').length}; manual review/not assessed: ${findings.filter((item) => item.category === 'review' || item.category === 'not-assessed').length}.`);
  paragraph('Use guide.txt to rehearse preparing individual files and verifying evidence. Keep this test set out of CivCheck and HNL Build.');
  paragraph('Source PDFs - unchanged bytes; not verified as submission-ready', true);
  for (const record of included) {
    paragraph(`${packagePath(record)} | original: ${record.originalName} | revision: ${record.revision} | pages: ${record.pages.length} | bytes: ${record.bytes}`);
    paragraph(`SHA-256: ${record.hash.toLowerCase()}`);
  }
  for (const record of omitted) {
    paragraph(`Omitted unreadable reference: ${record.originalName} | revision: ${record.revision}`);
  }
  paragraph('Findings - unresolved unless addressed outside this report', true);
  if (findings.length === 0) paragraph('No findings were supplied. This is not a determination of compliance or completeness.');
  for (const finding of findings) {
    paragraph(`[${finding.category}] ${finding.title}`, true);
    paragraph(`Rule: ${finding.ruleId}; file: ${findingFileName(finding, documents) || '(project-wide)'}; page: ${finding.page ?? 'not specified'}; revision: ${finding.revision ?? 'not specified'}.`);
    paragraph(`Detail: ${finding.detail}`);
    paragraph(`Action: ${finding.action}`);
    paragraph(`Source: ${finding.source}`);
  }
  if (abbreviated) {
    page.drawText('PDF length limit reached. See manifest.json / findings.csv for full details.', { x: 48, y: 50, size: 9, font: bold });
  }
  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawText(label, { x: 48, y: 754, size: 8, font: bold });
    item.drawText(`REFERENCE ONLY - NOT FOR UPLOAD | Page ${index + 1} of ${pages.length}`, { x: 48, y: 30, size: 8, font });
  });
  return pdf.save();
}

/** Build a local handoff ZIP. Reject incomplete/stale sources; preserve every source byte. */
export async function buildPackage(
  projectName: string,
  documents: SourceDocument[],
  findings: Finding[],
  options?: BuildPackageOptions,
): Promise<Uint8Array> {
  if (documents.length === 0) throw new Error('At least one source document is required.');
  // Snapshot before awaiting hash reads so UI changes cannot mix two revisions.
  const snapshot = documents.map(({ record, file, syntheticSample }) => ({
    record: structuredClone(record), file, syntheticSample: syntheticSample ?? options?.syntheticDemo ?? true,
  }));
  const snapshotFindings = structuredClone(findings);
  const records = snapshot.map(({ record }) => record);
  const [blocker] = packageBlockers(records);
  if (blocker) throw new Error(blocker);
  const byId = new Map<string, typeof snapshot[number]>();
  for (const source of snapshot) {
    const id = source.record.id;
    if (byId.has(id)) throw new Error(`Duplicate source document ID: ${id}.`);
    byId.set(id, source);
  }
  const { included, omitted } = handoffFiles(records);
  const sources = included.map((record) => byId.get(record.id)!);
  const syntheticDemo = sources.some((source) => source.syntheticSample);
  const label = syntheticDemo ? DEMO_LABEL : TEST_LABEL;
  for (const finding of snapshotFindings) {
    if (!finding.fileId) continue;
    const record = records.find((item) => item.id === finding.fileId);
    if (!record || (finding.revision !== undefined && finding.revision !== record.revision)) {
      throw new Error(`Finding refers to an absent or stale source revision: ${finding.id}.`);
    }
    if (finding.page !== undefined && (!Number.isInteger(finding.page) || finding.page < 1 || finding.page > record.pages.length)) {
      throw new Error(`Finding refers to an invalid source page: ${finding.id}.`);
    }
  }
  const entries: Record<string, Uint8Array> = Object.create(null) as Record<string, Uint8Array>;
  for (const { record, file } of sources) {
    validateRecord(record, file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength !== record.bytes || await sha256(bytes) !== record.hash.toLowerCase()) {
      throw new Error(`Source SHA-256 hash or bytes no longer match: ${record.originalName}. Reanalyze the file.`);
    }
    entries[packagePath(record)] = bytes;
  }
  const exportedAt = new Date().toISOString();
  const sourceMetadata = sources.map(({ record, syntheticSample }) => ({
    id: record.id,
    revision: record.revision,
    originalName: record.originalName,
    exportName: record.exportName,
    kind: record.kind,
    disposition: record.disposition ?? 'source',
    bytes: record.bytes,
    hash: record.hash.toLowerCase(),
    hashAlgorithm: 'SHA-256',
    path: packagePath(record),
    provenance: syntheticSample ? 'synthetic-sample' : 'user-supplied-test',
    pages: record.pages.map(({ page, widthInches, heightInches, rotation }) => ({ page, widthInches, heightInches, rotation })),
    sourceBytesPreserved: true,
  }));
  const omittedReferences = omitted.map(({ id, originalName, revision }) => ({ id, originalName, revision, reason: 'Unreadable reference omitted by the preparer.' }));
  // Timestamps and the internal full-text layer do not identify a different export snapshot.
  const projectRevision = await sha256(strToU8(JSON.stringify({
    schemaVersion: SCHEMA_VERSION, projectName, rulePack: DEMO_RULE_PACK, exportPack: EXPORT_PACK,
    documents: sourceMetadata, omittedReferences, findings: snapshotFindings,
  })));
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    packageLabel: label,
    testOnly: true,
    omittedReferences,
    syntheticDemo,
    disclaimer: DISCLAIMER,
    exportedAt,
    projectName,
    projectRevision,
    projectRevisionKind: 'sha256-of-versioned-source-metadata-and-findings',
    applicationPersistence: false,
    rulePack: DEMO_RULE_PACK,
    exportPack: EXPORT_PACK,
    libraries: { 'pdf-lib': '1.17.1', fflate: '0.8.3' },
    complianceAssessed: false,
    submissionReady: false,
    unresolved: {
      fix: snapshotFindings.filter((item) => item.category === 'fix').length,
      review: snapshotFindings.filter((item) => item.category === 'review').length,
      notAssessed: snapshotFindings.filter((item) => item.category === 'not-assessed').length,
    },
    documents: sourceMetadata.map((metadata, index) => {
      const { lastModified } = sources[index].file;
      return {
        ...metadata,
        sourceLastModified: Number.isFinite(lastModified) && Math.abs(lastModified) <= 8.64e15
          ? new Date(lastModified).toISOString() : null,
      };
    }),
    findings: snapshotFindings,
    referenceFiles: ['reference/guide.txt', 'reference/findings.csv', 'reference/manifest.json', 'reference/readiness.pdf',
      ...sourceMetadata.filter(({ disposition }) => disposition === 'reference').map(({ path }) => path)],
    referenceFilesAreUploadCandidates: false,
  };
  entries['reference/guide.txt'] = strToU8(guide(included, snapshotFindings, label, omitted));
  entries['reference/findings.csv'] = strToU8(findingsCsv(records, snapshotFindings, label));
  entries['reference/manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  entries['reference/readiness.pdf'] = await readinessReport(projectName, records, snapshotFindings, exportedAt, projectRevision, label, syntheticDemo);
  return zipSync(entries, { level: 6 });
}

/** Initiate a browser download; deliberately unavailable in SSR/Node contexts. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Downloads are available only in a browser.');
  }
  if (!filename || /[\\/\u0000-\u001f\u007f]/.test(filename) || filename === '.' || filename === '..') {
    throw new Error('A safe download filename is required.');
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Let the browser consume the URL before releasing it (including Firefox).
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
