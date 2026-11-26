import type { DocumentRecord } from '@hnl/contracts';
import { isTitleSheetName } from '@hnl/core';
import { exportNameBlockers } from './exportNames';

export function isOmittedReference(record: DocumentRecord): boolean {
  return record.disposition === 'reference' && !!record.omitFromPackage &&
    (record.status === 'error' || record.status === 'unsupported');
}

function fileOrder(record: DocumentRecord): number {
  if (record.disposition === 'reference') return 3;
  if (record.kind === 'supporting') return 2;
  return isTitleSheetName(record.exportName) ? 0 : 1;
}

export function handoffFiles(records: readonly DocumentRecord[]) {
  const omitted = records.filter(isOmittedReference);
  const included = records.filter((record) => !isOmittedReference(record)).sort((a, b) =>
    fileOrder(a) - fileOrder(b) || a.exportName.localeCompare(b.exportName, 'en', { numeric: true }));
  return {
    included,
    omitted,
    sources: included.filter((record) => record.disposition !== 'reference' && !record.typeReview),
    references: included.filter((record) => record.disposition === 'reference' && !record.typeReview),
  };
}

export function packageBlockers(records: readonly DocumentRecord[]): string[] {
  const { included } = handoffFiles(records);
  if (!included.length) return ['At least one source document is required.'];
  return [
    ...exportNameBlockers(included),
    ...included.flatMap((record) => {
      if (record.typeReview) return [`Confirm the file type for ${record.exportName}.`];
      if (record.status === 'complete') return [];
      return [record.disposition === 'reference'
        ? `Replace ${record.originalName} or choose Omit from ZIP in Add plans.`
        : `Every source must have complete analysis; ${record.originalName} is ${record.status}.`];
    }),
  ];
}

export function packagePath(record: DocumentRecord): string {
  return record.disposition === 'reference'
    ? `reference/source-pdfs/${record.exportName}`
    : `upload/${record.kind}/${record.exportName}`;
}
