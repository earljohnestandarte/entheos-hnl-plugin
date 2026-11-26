import { useRef, useState } from 'react';
import { suggestFilename } from '@hnl/core';
import type { CheckSummary, DocumentRecord, FileKind } from '@hnl/contracts';

interface FileItem { record: DocumentRecord; demo: boolean }
interface Props {
  items: FileItem[]; summary: CheckSummary; busy: boolean; exporting: boolean; guided: boolean; highlightedId: string | null;
  onAdd: (files: File[]) => void; onReplace: (id: string, file: File) => void;
  onRename: (id: string, name: string) => void; onClassify: (id: string, kind: FileKind) => void;
  onPreview: (id: string) => void; onRemove: (id: string) => void; onCorrectDemo: (id: string) => void; onContinue: () => void;
}
const sizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

function FilenameEditor({ record, busy, onRename }: { record: DocumentRecord; busy: boolean; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(record.exportName);
  if (!editing) return <div className="filename-actions"><button className="button ghost" disabled={busy} onClick={() => { setName(suggestFilename(record.exportName, record.kind)); setEditing(true); }}>Review filename <span aria-hidden="true">↗</span></button>{record.exportName !== record.originalName && <button className="button ghost" disabled={busy} onClick={() => onRename(record.originalName)}>Undo rename</button>}</div>;
  return <form className="filename-editor" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { onRename(name.trim()); setEditing(false); } }}>
    <label className="field-label">Proposed export name<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoFocus disabled={busy} /></label>
    <p className="field-hint">Before: {record.exportName}<br />Check the sheet number. Only the downloaded filename changes—not your original.</p>
    <div className="action-row"><button className="button primary" disabled={busy || !name.trim()}>Accept name</button><button className="button secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>;
}

export function FilesPanel(props: Props) {
  const { items, summary, busy, exporting, guided, highlightedId } = props;
  const picker = useRef<HTMLInputElement>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const samplePlan = items.find((item) => item.demo && /^A101/.test(item.record.originalName));
  const renamed = samplePlan && !samplePlan.record.exportName.includes('&');
  const corrected = samplePlan?.record.pages.some((page) => page.widthInches > page.heightInches);

  return <>
    {guided && <section className="guided-card" aria-label="Guided sample checklist"><div><h2>Sample exercise</h2><p>Correct the filename and portrait sheet. Then review what this tool cannot check.</p></div><ol><li className={renamed ? 'is-done' : ''}><span>{renamed ? '✓' : '1'}</span>Review and accept the floor-plan filename</li><li className={corrected ? 'is-done' : ''}><span>{corrected ? '✓' : '2'}</span>Use the corrected landscape sample PDF</li><li><span>3</span>{summary.formatChecksComplete ? 'Next: review manual and unassessed items' : 'Review remaining manual and unassessed items'}</li></ol></section>}
    <section className="panel"><div className="panel-heading"><div><h2>PDF files <span className="badge badge-neutral">{items.length} files</span></h2><p className="muted">Start with exported PDFs. Original files are never overwritten.</p></div><span className="badge badge-neutral">PDF only</span></div>
      <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) props.onAdd(Array.from(event.dataTransfer.files)); }}>
        <div><h3>{items.length ? 'Add another test PDF' : 'Drop your test PDFs here'}</h3><p>20 files max · 25 MB each · 100 MB total</p></div><button className="button secondary" disabled={busy} onClick={() => picker.current?.click()}>Choose PDF files</button>
      </div>
      <input hidden type="file" ref={picker} multiple accept=".pdf,application/pdf" aria-label="Add test PDFs" onChange={(event) => { props.onAdd(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <input hidden type="file" ref={replacement} accept=".pdf,application/pdf" aria-label="Replacement test PDF" onChange={(event) => { const file = event.target.files?.[0]; if (file && replaceId.current) props.onReplace(replaceId.current, file); event.target.value = ''; }} />
      <p className="classification-hint"><strong>Plan</strong> = a drawing sheet. <strong>Supporting document</strong> = a form or other document; it may have multiple pages. Suggestions need your review.</p>
      {!items.length && <div className="empty-state"><h3>Your files will appear here.</h3><p>Add non-sensitive test PDFs. We’ll show file checks and your next action—not a compliance verdict.</p></div>}
      <div className="file-list">{items.map(({ record, demo }) => {
        const count = summary.findings.filter((finding) => finding.fileId === record.id && finding.category === 'fix').length;
        const first = record.pages[0];
        return <article id={`file-${record.id}`} tabIndex={-1} className={`file-card ${highlightedId === record.id ? 'is-highlighted' : ''}`} key={record.id} aria-label={record.exportName}>
          <div className="file-heading"><div className="file-name"><h3>{record.exportName}</h3><p>{record.status === 'analyzing' ? 'Reading PDF…' : record.status === 'complete' && first ? `${record.pages.length} ${record.pages.length === 1 ? 'page' : 'pages'} · ${first.widthInches.toFixed(1)} × ${first.heightInches.toFixed(1)} in` : 'Contents not assessed'} · {sizeLabel(record.bytes)} · Revision {record.revision}</p></div><span className={`badge ${count ? 'badge-warning' : 'badge-neutral'}`}>{record.status === 'analyzing' ? 'Processing' : record.status !== 'complete' ? 'Needs attention' : count ? `${count} ${count === 1 ? 'fix' : 'fixes'}` : 'File read'}</span></div>
          <div className="original-name"><span>Original file</span> {record.originalName}</div>
          {record.error && <p className="error-text">{record.error}</p>}
          <div className="file-controls"><label className="inline-label">Classification<select aria-label={`File type for ${record.originalName}`} disabled={busy} value={record.kind} onChange={(event) => props.onClassify(record.id, event.target.value as FileKind)}><option value="plan">Plan</option><option value="supporting">Supporting document</option></select></label><div className="action-row"><button className="button secondary" disabled={record.status !== 'complete' || exporting} onClick={() => props.onPreview(record.id)}>View PDF</button><button className="button secondary" disabled={busy} onClick={() => { replaceId.current = record.id; replacement.current?.click(); }}>Replace</button><button className="button ghost danger" disabled={exporting} onClick={() => props.onRemove(record.id)}>Remove</button></div></div>
          <div className="file-bottom"><FilenameEditor key={`${record.revision}-${record.exportName}`} record={record} busy={busy} onRename={(name) => props.onRename(record.id, name)} />{demo && /^A101/.test(record.originalName) && record.pages.some((page) => page.heightInches > page.widthInches) && <button className="button sample-action" disabled={busy} onClick={() => props.onCorrectDemo(record.id)}>Use corrected sample PDF <span aria-hidden="true">→</span></button>}</div>
        </article>;
      })}</div>
      <div className="panel-footer"><p className="muted small">Changes recalculate covered file and set-level checks.</p><button className="button primary" disabled={!items.length || busy} onClick={props.onContinue}>Fix & review <span aria-hidden="true">→</span></button></div>
    </section>
  </>;
}
