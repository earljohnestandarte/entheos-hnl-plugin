import { DEMO_RULE_PACK, type DocumentRecord, type Finding } from '@hnl/contracts';
import { csvCell, isSafeExportName } from '@hnl/core';
import { strToU8, zipSync } from 'fflate';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export interface SourceDocument {
  record: DocumentRecord;
  file: File;
}

const DEMO_LABEL = 'SYNTHETIC-DEMO PACKAGE - NOT A COMPLIANCE DETERMINATION';
const REAL_LABEL = 'LOCAL PREPARATION PACKAGE - NOT A COMPLIANCE DETERMINATION';
const DISCLAIMER = 'Preparation reference only. Unresolved fixes and manual reviews may remain. This package does not establish completeness, code compliance, permit approval, or readiness for submission.';
const EXPORT_PACK = { id: 'hnl-preparation-export', version: '0.2.0' } as const;

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
  if (!isSafeExportName(record.exportName) || !/\.pdf$/i.test(record.exportName)) {
    throw new Error(`Unsafe export filename: ${record.exportName}.`);
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

function uploadPath(record: DocumentRecord): string {
  return `upload/${record.kind}/${record.exportName}`;
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

function guide(documents: DocumentRecord[], findings: Finding[], label: string, syntheticDemo: boolean): string {
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
    'reference/: guide, findings CSV, manifest JSON, and readiness PDF. These are local reference reports, NOT upload candidates.',
    syntheticDemo
      ? 'The synthetic-demo label describes this demonstration package; it does not certify the provenance or accuracy of user-provided source PDFs.'
      : 'All source bytes in upload/ are preserved unchanged from your local files.',
    '',
    'MANUAL CIVCHECK HANDOFF - confirm current instructions in the actual portal',
    '1. Extract the ZIP locally. This is an organizational download, not a CivCheck ingestion format. Do not upload this ZIP or any reference/ report to CivCheck.',
    '2. Confirm project eligibility, scope, details, current requirements, and outstanding fixes with the appropriate professional. Synthetic examples must never be submitted as a real project.',
    '3. In project setup, upload the appropriate individual source PDFs from upload/. Inspect portal processing results. Resolve errors and replace revised files manually.',
    '4. In the Files panel, manually verify each Plan/Other classification: plan files normally correspond to Plan and supporting files to Other. Local folder labels do not assign anything in CivCheck.',
    '5. In Document review, use the actual project-specific required-document list. Accept/dismiss suggestions or select the correct files and page ranges manually. This app does not infer required documents or document-type assignments, and does not prove the set is complete.',
    '6. In Intake review, verify actual evidence and manually apply/dismiss highlights, answer attestations, and resolve checks. A text match is not a verified highlight or proof of correctness. Title block, sheet index, and approval-stamp space still require visual/manual review.',
    '7. In Plan review, complete the portal questions, evidence highlights, and any flagged follow-up. No code review or professional judgment is replaced by this report.',
    '8. Follow the current official process for completion and any later HNL Build submission. This app creates no CivCheck ID, certificate of completion, or CivCheck-watermarked plans; it does not submit to either service.',
    '',
    'REFERENCE LIMITATIONS',
    `Demo rule pack: ${DEMO_RULE_PACK.id} ${DEMO_RULE_PACK.version}.`,
    `Authority: ${DEMO_RULE_PACK.authority}`,
    `Basis: ${DEMO_RULE_PACK.source}`,
    'No external network or app persistence is used by this export. Keep downloaded files secure.',
    'The PDF uses a restricted display alphabet and may abbreviate very long text; manifest JSON and findings CSV retain the supplied text.',
    '',
    'SOURCE FILE MAP (original -> exported path; no portal assignments implied)',
    ...documents.map((record) => `${JSON.stringify(record.originalName)} -> ${JSON.stringify(uploadPath(record))}; revision ${record.revision}; SHA-256 ${record.hash.toLowerCase()}`),
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
  paragraph('Display note: unsupported Unicode is replaced with ?, controls with spaces, and long fields may be abbreviated. Full original text remains in manifest.json and findings.csv.');
  paragraph(`Sources: ${documents.length}; findings: ${findings.length}; fix: ${findings.filter((item) => item.category === 'fix').length}; manual review/not assessed: ${findings.filter((item) => item.category === 'review' || item.category === 'not-assessed').length}.`);
  paragraph('No certificate, CivCheck ID, watermarked plans, verified assignments, reliable stamp-space check, or submission is produced. See guide.txt for manual portal steps.');
  paragraph('Source PDFs - unchanged bytes; not verified as submission-ready', true);
  for (const record of documents) {
    paragraph(`${uploadPath(record)} | original: ${record.originalName} | revision: ${record.revision} | pages: ${record.pages.length} | bytes: ${record.bytes}`);
    paragraph(`SHA-256: ${record.hash.toLowerCase()}`);
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
  const syntheticDemo = options?.syntheticDemo ?? true;
  const label = syntheticDemo ? DEMO_LABEL : REAL_LABEL;
  if (documents.length === 0) throw new Error('At least one source document is required.');
  // Snapshot before awaiting hash reads so UI changes cannot mix two revisions.
  const sources = documents.map(({ record, file }) => ({ record: structuredClone(record), file }));
  const snapshotFindings = structuredClone(findings);
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const { record, file } of sources) {
    validateRecord(record, file);
    const key = record.exportName.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate export filename (case-insensitive): ${record.exportName}.`);
    if (ids.has(record.id)) throw new Error(`Duplicate source document ID: ${record.id}.`);
    names.add(key);
    ids.add(record.id);
  }
  const records = sources.map(({ record }) => record);
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
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength !== record.bytes || await sha256(bytes) !== record.hash.toLowerCase()) {
      throw new Error(`Source SHA-256 hash or bytes no longer match: ${record.originalName}. Reanalyze the file.`);
    }
    entries[uploadPath(record)] = bytes;
  }
  const exportedAt = new Date().toISOString();
  // A content-derived snapshot ID is honest about this stateless API: it is not
  // an invented monotonic project revision or evidence of persisted history.
  const projectRevision = await sha256(strToU8(JSON.stringify({
    projectName, rulePack: DEMO_RULE_PACK, exportPack: EXPORT_PACK, documents: records, findings: snapshotFindings,
  })));
  const manifest = {
    schemaVersion: 1,
    packageLabel: label,
    syntheticDemo,
    disclaimer: DISCLAIMER,
    exportedAt,
    projectName,
    projectRevision,
    projectRevisionKind: 'sha256-of-project-name-packs-document-records-and-findings',
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
    documents: sources.map(({ record, file }) => ({
      ...record,
      hash: record.hash.toLowerCase(),
      hashAlgorithm: 'SHA-256',
      path: uploadPath(record),
      sourceBytesPreserved: true,
      sourceLastModified: Number.isFinite(file.lastModified) && Math.abs(file.lastModified) <= 8.64e15
        ? new Date(file.lastModified).toISOString() : null,
    })),
    findings: snapshotFindings,
    referenceFiles: ['reference/guide.txt', 'reference/findings.csv', 'reference/manifest.json', 'reference/readiness.pdf'],
    referenceFilesAreUploadCandidates: false,
  };
  entries['reference/guide.txt'] = strToU8(guide(records, snapshotFindings, label, syntheticDemo));
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
