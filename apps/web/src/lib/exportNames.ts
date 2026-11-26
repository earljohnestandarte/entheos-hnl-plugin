import type { DocumentRecord } from '@hnl/contracts';
import { isSafeExportName } from '@hnl/core';

export function exportNameIssue(name: string, records: readonly DocumentRecord[], currentId: string): string | undefined {
  if (!isSafeExportName(name)) return 'Use a PDF filename with up to 45 characters. Use letters, digits, spaces, hyphens, underscores, and periods.';
  if (records.some((record) => record.id !== currentId && record.exportName.toLowerCase() === name.toLowerCase())) {
    return 'Another file already uses this export name. Choose a distinct name.';
  }
  return undefined;
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
