import { useState } from 'react';
import type { CheckSummary, DocumentRecord } from '@hnl/contracts';
import { handoffChecklist, handoffChecklistText } from '../lib/handoffChecklist';

export function CivCheckChecklist({ records, summary, onPreview, canCopy }: {
  records: DocumentRecord[];
  summary: CheckSummary;
  onPreview: (fileId: string, page: number) => void;
  canCopy: boolean;
}) {
  const checklist = handoffChecklist(records, summary);
  const { sources: ordered, references, omitted, values, suggestions } = checklist;
  const [feedback, setFeedback] = useState('');

  async function copy() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(handoffChecklistText(checklist));
      setFeedback('Handoff checklist copied.');
    } catch {
      setFeedback('Clipboard access failed. Download the text checklist instead.');
    }
  }

  async function download() {
    if (!canCopy) return;
    try {
      const text = handoffChecklistText(checklist);
      const { downloadBytes } = await import('../lib/export');
      downloadBytes(new TextEncoder().encode(text), 'HNL-preflight-handoff-test-only.txt', 'text/plain;charset=utf-8');
      setFeedback('Text checklist downloaded.');
    } catch {
      setFeedback('The text checklist could not be downloaded. Try again.');
    }
  }

  return (
    <section aria-labelledby="handoff-checklist-title">
      <h3 className="panel-intro" id="handoff-checklist-title">CivCheck handoff checklist</h3>
      <p className="muted">Rehearse the first submission with this test set. Keep all test files and reports out of CivCheck and HNL Build.</p>
      <div className="action-row">
        <button type="button" className="button secondary sm" disabled={!canCopy} onClick={() => { void copy(); }}>Copy handoff checklist</button>
        <button type="button" className="button ghost sm" disabled={!canCopy} onClick={() => { void download(); }}>Download checklist TXT</button>
      </div>
      {feedback && <p className="field-hint" role="status">{feedback}</p>}
      <ol className="journey-list">
        <li>
          <strong>Files · plan order and classification</strong>
          <p>Start with the title sheet, then check the other plans and supporting files.</p>
          {ordered.length > 0 ? <ol>
            {ordered.map((record) => <li key={record.id}>{record.exportName} <span className="muted">· {record.kind === 'plan' ? 'Plan' : 'Other'}</span></li>)}
          </ol> : <p>No plan or supporting sources in this set.</p>}
          {references.length > 0 && <><p>Review-only PDFs</p><ul>
            {references.map((record) => <li key={record.id}>{record.exportName}</li>)}
          </ul></>}
          {omitted.length > 0 && <><p>Omitted unreadable references</p><ul>
            {omitted.map((record) => <li key={record.id}>{record.originalName}</li>)}
          </ul></>}
        </li>
        <li>
          <strong>Document review · verify files and pages</strong>
          {suggestions.length > 0 ? <ul aria-label="Suggested document assignments">
            {suggestions.map((slot) => (
              <li key={slot.docType}>
                <span>{slot.docType}</span>
                <ul>
                  {slot.files.map((file) => <li key={file.fileId}>
                    {file.fileName} <span className="muted">· {file.pagesLabel}{file.confidence === 'medium' ? ' · Tentative' : ''}</span>
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
                {entry.candidates.map(({ value, source }) => (
                  <li key={value}>
                    {value}{' '}
                    <button type="button" className="button ghost sm" onClick={() => onPreview(source.fileId, source.page)}>
                      {source.fileName}, p. {source.page}
                    </button>
                  </li>
                ))}
              </ul> : <span className="muted"> · Review manually</span>}
            </li>)}
          </ul>
        </li>
      </ol>
    </section>
  );
}
