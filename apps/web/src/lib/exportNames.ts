import type { DocumentRecord } from '@hnl/contracts';
import { isSafeExportName } from '@hnl/core';

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
