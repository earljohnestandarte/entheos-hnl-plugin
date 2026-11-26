import type { CheckSummary, DocumentRecord } from '@hnl/contracts';
import { isTitleSheetName } from '@hnl/core';
import { handoffFiles, packagePath } from './handoffFiles';

function pageRanges(pages: number[]): string {
  const ranges: Array<[number, number]> = [];
  for (const page of pages) {
    const last = ranges.at(-1);
    if (last && page === last[1] + 1) last[1] = page;
    else ranges.push([page, page]);
  }
  return ranges.map(([first, last]) => first === last ? String(first) : `${first}–${last}`).join(', ');
}

export function handoffChecklist(records: DocumentRecord[], summary: CheckSummary) {
  const { sources, references, omitted } = handoffFiles(records);
  const sourceOrder = new Map(sources.map((record, index) => [record.id, index]));
  const suggestions = summary.assignments.map(({ docType, assignedFiles }) => ({
    docType,
    files: assignedFiles.filter((file) => sourceOrder.has(file.fileId))
      .sort((a, b) => sourceOrder.get(a.fileId)! - sourceOrder.get(b.fileId)!)
      .map((file) => ({ ...file, pagesLabel: file.pages.length
        ? `${file.pages.length === 1 ? 'Page' : 'Pages'} ${pageRanges(file.pages)}` : 'Verify page range' })),
  })).filter(({ files }) => files.length > 0);
  const values = summary.extractedValues.filter((entry) => ['owner', 'address', 'tmk'].includes(entry.key))
    .map(({ key, label, status, candidates }) => ({
      key, label, status,
      candidates: candidates.map(({ value, occurrences }) => ({
        value,
        source: occurrences.find((occurrence) => isTitleSheetName(occurrence.fileName)) ?? occurrences[0],
      })),
    }));
  const openFindings = summary.findings.filter(({ category }) => category !== 'advisory').map((finding) => ({
    ...finding,
    file: records.find((record) => record.id === finding.fileId)?.exportName,
  }));
  return { sources, references, omitted, suggestions, values, openFindings };
}

function printable(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 240 ? `${clean.slice(0, 239)}…` : clean;
}

export function handoffChecklistText(checklist: ReturnType<typeof handoffChecklist>): string {
  const { sources, references, omitted, suggestions, values, openFindings } = checklist;
  return [
    'CivCheck handoff rehearsal · TEST ONLY',
    'Use these notes for local practice. Keep test files and reports out of CivCheck and HNL Build.',
    '',
    'Files in rehearsal order',
    ...sources.map((record, index) => `${index + 1}. ${packagePath(record)} · ${record.kind === 'plan' ? 'Plan' : 'Other'}`),
    ...references.map((record) => `Review-only · ${packagePath(record)}`),
    ...omitted.map((record) => `Omitted unreadable reference · ${printable(record.originalName)}`),
    '',
    'Document review suggestions',
    ...suggestions.flatMap(({ docType, files }) => files.map((file) =>
      `${docType} · ${file.fileName} · ${file.pagesLabel}${file.confidence === 'medium' ? ' · Tentative' : ''}`)),
    '',
    'Title-block evidence to verify',
    ...values.flatMap(({ label, status, candidates }) => candidates.length ? candidates.map(({ value, source }) =>
      `${label} · ${printable(value)} · ${source.fileName}, page ${source.page}, revision ${source.revision}${status === 'conflicting' ? ' · Conflicting value' : ''}`)
      : [`${label} · Review manually`]),
    '',
    'Open findings',
    ...openFindings.map(({ title, category, file, page }) =>
      `${category} · ${printable(title)}${file ? ` · ${file}${page ? `, page ${page}` : ''}` : ''}`),
    '',
  ].join('\n');
}
