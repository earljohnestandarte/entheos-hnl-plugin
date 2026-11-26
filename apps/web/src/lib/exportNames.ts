import { DEMO_RULE_PACK, type CheckSummary, type DocumentRecord, type FileKind } from '@hnl/contracts';
import { hasValidPlanLayout, isSafeExportName, planFilenameIssue, sheetIdentifier } from '@hnl/core';

export interface FilenameValidation {
  safeError?: string;
  duplicateError?: string;
  planWarning?: string;
  sheetId?: string;
  isValidForRole: boolean;
}

export interface FileValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'review' | 'pending';
  detail: string;
}

export function exportNameIssue(name: string, records: readonly DocumentRecord[], currentId: string): string | undefined {
  const result = validateFilename(name, 'supporting', 'source', records, currentId);
  return result.safeError ?? result.duplicateError;
}

export function fileVerificationKey(record: DocumentRecord): string {
  return `${record.revision}:${record.exportName}:${record.kind}:${record.disposition ?? 'source'}:${record.typeReview ? 'pending' : 'ok'}`;
}

/** Clean syntax errors from the current filename while preserving its title. */
export function suggestCleanFilename(name: string, kind: FileKind): string {
  const trimmed = name.trim();
  if (isSafeExportName(trimmed)) {
    if (kind === 'plan') {
      const prefix = trimmed.match(/^([a-z]{0,2}\d{3})([ _-]+)(.+)\.pdf$/i);
      if (prefix && !prefix[2].includes('-')) {
        const sheet = prefix[1].toUpperCase();
        const title = prefix[3].trim();
        const candidate = `${sheet} - ${title}.pdf`;
        if (isSafeExportName(candidate)) return candidate;
      }
    }
    return trimmed;
  }

  const basename = trimmed.split(/[\\/]/).pop() ?? '';
  const stem = basename
    .replace(/\.[a-z0-9]{1,10}$/i, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9 ._-]/gi, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/ +/g, ' ')
    .replace(/^[ .]+|[ .]+$/g, '');

  if (kind === 'plan') {
    const prefix = stem.match(/^([a-z]{0,2}\d{3})(?=$|[ ._-])/i);
    if (prefix) {
      const sheet = prefix[1].toUpperCase();
      const title = stem.slice(prefix[0].length).replace(/^[ ._-]+/, '');
      if (title) {
        const available = DEMO_RULE_PACK.filenameMaxLength - sheet.length - 3 - 4;
        const shortened = title.slice(0, available).replace(/[ .]+$/g, '');
        if (shortened) {
          const candidate = `${sheet} - ${shortened}.pdf`;
          if (isSafeExportName(candidate)) return candidate;
        }
      }
    }
  }

  const shortened = stem
    .slice(0, DEMO_RULE_PACK.filenameMaxLength - 4)
    .replace(/[ .]+$/g, '');
  const candidate = `${shortened}.pdf`;
  if (isSafeExportName(candidate)) return candidate;
  return kind === 'plan' ? 'Review Sheet.pdf' : 'Supporting Document.pdf';
}

export function validateFilename(
  rawName: string,
  kind: FileKind,
  disposition: 'source' | 'reference' | undefined,
  records: readonly DocumentRecord[],
  currentId: string,
): FilenameValidation {
  const name = rawName.trim();
  const safeOk = isSafeExportName(name);
  const safeError = safeOk
    ? undefined
    : 'Use a PDF filename with up to 45 characters. Use letters, digits, spaces, hyphens, underscores, and periods.';
  const duplicateError = safeOk && records.some((record) => record.id !== currentId && record.exportName.toLowerCase() === name.toLowerCase())
    ? 'Another file already uses this export name. Choose a distinct name.'
    : undefined;

  let planWarning: string | undefined;
  let sheetId: string | undefined;
  if (safeOk && kind === 'plan' && disposition !== 'reference') {
    planWarning = planFilenameIssue(name);
    sheetId = sheetIdentifier(name);
    if (!planWarning && sheetId) {
      const collidesSheet = records.some((record) =>
        record.id !== currentId &&
        record.kind === 'plan' &&
        record.disposition !== 'reference' &&
        !record.typeReview &&
        sheetIdentifier(record.exportName) === sheetId);
      if (collidesSheet) {
        planWarning = `Sheet ID ${sheetId} is already used by another plan in this set.`;
      }
    }
  }

  return {
    safeError,
    duplicateError,
    planWarning,
    sheetId,
    isValidForRole: !safeError && !duplicateError && !planWarning,
  };
}

export function validateDocumentChecks(
  record: DocumentRecord,
  records: readonly DocumentRecord[],
  summary: CheckSummary,
): FileValidationCheck[] {
  const checks: FileValidationCheck[] = [];
  const fileFindings = summary.findings.filter((finding) => finding.fileId === record.id);
  const isPlanSource = record.kind === 'plan' && record.disposition !== 'reference' && !record.typeReview;

  checks.push({
    id: 'classification',
    label: 'File classification',
    status: record.typeReview ? 'fail' : 'pass',
    detail: record.typeReview
      ? 'Confirm whether this file is a Plan, Supporting document, or Review-only reference.'
      : record.disposition === 'reference' ? 'Confirmed as review-only reference.' : `Classified as ${record.kind === 'plan' ? 'Plan sheet' : 'Supporting document'}.`,
  });

  const nameCheck = validateFilename(record.exportName, record.kind, record.disposition, records, record.id);
  const nameProblem = nameCheck.safeError ?? nameCheck.duplicateError ?? nameCheck.planWarning;
  checks.push({
    id: 'filename',
    label: isPlanSource ? 'Plan filename & sheet ID' : 'Safe export filename',
    status: nameProblem ? 'fail' : 'pass',
    detail: nameProblem ?? (nameCheck.sheetId ? `Matches plan naming (${nameCheck.sheetId}).` : 'Portable ASCII PDF filename.'),
  });

  checks.push({
    id: 'readability',
    label: 'PDF readability',
    status: record.status === 'complete' ? 'pass' : record.status === 'analyzing' ? 'pending' : 'fail',
    detail: record.status === 'complete'
      ? `Parsed ${record.pages.length} ${record.pages.length === 1 ? 'page' : 'pages'} at revision ${record.revision}.`
      : record.status === 'analyzing' ? 'Waiting for local PDF analysis to finish.' : record.error ?? 'PDF could not be read.',
  });

  if (isPlanSource && record.status === 'complete') {
    checks.push({
      id: 'page-count',
      label: 'Single-page plan sheet',
      status: record.pages.length === 1 ? 'pass' : 'fail',
      detail: record.pages.length === 1
        ? 'Contains 1 drawing sheet.'
        : `Contains ${record.pages.length} pages; export one sheet per plan PDF.`,
    });

    const badLayout = record.pages.find((page) => !hasValidPlanLayout(page));
    checks.push({
      id: 'layout',
      label: `Landscape & size (≥ ${DEMO_RULE_PACK.minWidthInches} × ${DEMO_RULE_PACK.minHeightInches} in)`,
      status: badLayout ? 'fail' : 'pass',
      detail: badLayout
        ? `Page ${badLayout.page} is ${badLayout.widthInches.toFixed(1)} × ${badLayout.heightInches.toFixed(1)} in.`
        : `${record.pages[0].widthInches.toFixed(1)} × ${record.pages[0].heightInches.toFixed(1)} in landscape.`,
    });

    const sizeMismatch = fileFindings.find((finding) => finding.ruleId === 'common-sheet-size');
    if (sizeMismatch) {
      checks.push({
        id: 'common-size',
        label: 'Common plan set size',
        status: 'fail',
        detail: sizeMismatch.detail,
      });
    }
  }

  if (record.status === 'complete') {
    const missingText = record.pages.some((page) => page.text.replace(/[\s\u200B-\u200D\u2060]/gu, '').length === 0);
    checks.push({
      id: 'text-layer',
      label: 'Extracted text layer',
      status: missingText ? 'review' : 'pass',
      detail: missingText
        ? 'At least one page has no extracted text — inspect visually.'
        : 'Readable text extracted for local evidence checks.',
    });
  }

  return checks;
}

export function exportNameBlockers(records: readonly DocumentRecord[]): string[] {
  const names = new Set<string>();
  const blockers = new Set<string>();
  for (const record of records) {
    const name = record.exportName;
    if (!isSafeExportName(name)) blockers.add(`Unsafe export filename: ${name || record.originalName}.`);
    const key = name.toLowerCase();
    if (names.has(key)) blockers.add(`Duplicate export filename (case-insensitive): ${name}.`);
    names.add(key);
  }
  return [...blockers];
}
