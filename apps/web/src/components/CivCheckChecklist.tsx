import type { CheckSummary, DocumentRecord } from '@hnl/contracts';
import { isTitleSheetName } from '@hnl/core';

function pageRanges(pages: number[]): string {
  const ranges: Array<[number, number]> = [];
  for (const page of pages) {
    const last = ranges.at(-1);
    if (last && page === last[1] + 1) last[1] = page;
    else ranges.push([page, page]);
  }
  return ranges.map(([first, last]) => first === last ? String(first) : `${first}–${last}`).join(', ');
}

export function CivCheckChecklist({ records, summary, onPreview }: {
  records: DocumentRecord[];
  summary: CheckSummary;
  onPreview: (fileId: string, page: number) => void;
}) {
  const referenceIds = new Set(summary.checklistItems.map((item) => item.sourceFileId));
  const order = (record: DocumentRecord) => record.kind === 'supporting' ? 2 : isTitleSheetName(record.exportName) ? 0 : 1;
  const ordered = records.filter((record) => !referenceIds.has(record.id))
    .sort((a, b) => order(a) - order(b) || a.exportName.localeCompare(b.exportName, 'en', { numeric: true }));
  const values = summary.extractedValues.filter((entry) => ['owner', 'address', 'tmk'].includes(entry.key));
  const suggestions = summary.assignments.map((slot) => ({
    ...slot, assignedFiles: slot.assignedFiles.filter((file) => !referenceIds.has(file.fileId)),
  })).filter((slot) => slot.assignedFiles.length > 0);

  return (
    <section aria-labelledby="handoff-checklist-title">
      <h3 className="panel-intro" id="handoff-checklist-title">CivCheck handoff checklist</h3>
      <p className="muted">Rehearse the first submission with this test set. Keep all test files and reports out of CivCheck and HNL Build.</p>
      <ol className="journey-list">
        <li>
          <strong>Files · plan order and classification</strong>
          <p>Start with the title sheet, then check the other plans and supporting files.</p>
          {ordered.length > 0 ? <ol>
            {ordered.map((record) => <li key={record.id}>{record.exportName} <span className="muted">· {record.kind === 'plan' ? 'Plan' : 'Other'}</span></li>)}
          </ol> : <p>No plan or supporting sources in this set.</p>}
          {referenceIds.size > 0 && <p>Imported CivCheck checklists are review references. Set them aside during the upload rehearsal.</p>}
        </li>
        <li>
          <strong>Document review · verify files and pages</strong>
          {suggestions.length > 0 ? <ul aria-label="Suggested document assignments">
            {suggestions.map((slot) => (
              <li key={slot.docType}>
                <span>{slot.docType}</span>
                <ul>
                  {slot.assignedFiles.map((file) => <li key={file.fileId}>
                    {file.fileName} <span className="muted">· {file.pages.length ? `Pages ${pageRanges(file.pages)}` : 'Verify page range'}{file.confidence === 'medium' ? ' · Tentative' : ''}</span>
                  </li>)}
                </ul>
              </li>
            ))}
          </ul> : <p>Review document types and page ranges manually.</p>}
        </li>
        <li>
          <strong>Intake review · find repeated title-block values</strong>
          <p>Use these source pages to locate values. Verify the evidence on each applicable plan sheet.</p>
          <ul aria-label="Title-block evidence">
            {values.map((entry) => <li key={entry.key}>
              {entry.label}{entry.status === 'conflicting' ? ' · Conflicting values' : ''}
              {entry.candidates.length ? <ul>
                {entry.candidates.map((candidate) => {
                  const source = candidate.occurrences.find((occurrence) => isTitleSheetName(occurrence.fileName)) ?? candidate.occurrences[0];
                  return <li key={candidate.value}>
                    {candidate.value}{' '}
                    <button type="button" className="button ghost sm" onClick={() => onPreview(source.fileId, source.page)}>
                      {source.fileName}, p. {source.page}
                    </button>
                  </li>;
                })}
              </ul> : <span className="muted"> · Review manually</span>}
            </li>)}
          </ul>
        </li>
      </ol>
    </section>
  );
}
