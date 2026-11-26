import { useEffect, useRef, useState } from 'react';
import { suggestFilename } from '@hnl/core';
import type { CheckSummary, DocumentRecord, FileKind } from '@hnl/contracts';
import { IconEye, IconReplace, IconTrash, SheetThumb } from './Icons';

interface FileItem { record: DocumentRecord; demo: boolean }
interface Props {
  items: FileItem[]; summary: CheckSummary; busy: boolean; exporting: boolean; guided: boolean; highlightedId: string | null;
  onAdd: (files: File[]) => void; onReplace: (id: string, file: File) => void;
  onRename: (id: string, name: string) => void; onClassify: (id: string, kind: FileKind) => void;
  onPreview: (id: string) => void; onRemove: (id: string) => void; onCorrectDemo: (id: string) => void; onContinue: () => void;
}
const sizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
const isPdfFile = (file: File) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

async function readEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => resolve([file]), () => resolve([]));
    });
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const collected: File[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
    if (!batch.length) break;
    for (const child of batch) {
      collected.push(...await readEntryFiles(child));
    }
  }
  return collected;
}

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items ?? [])
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (!entries.length) return Array.from(dataTransfer.files);
  const nested = await Promise.all(entries.map((entry) => readEntryFiles(entry)));
  return nested.flat();
}

function FilenameEditor({ record, busy, onRename }: { record: DocumentRecord; busy: boolean; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(record.exportName);
  if (!editing) {
    return (
      <div className="filename-actions">
        <button type="button" className="button ghost sm" disabled={busy} onClick={() => { setName(suggestFilename(record.exportName, record.kind)); setEditing(true); }}>
          Review filename
        </button>
        {record.exportName !== record.originalName && (
          <button type="button" className="button ghost sm" disabled={busy} onClick={() => onRename(record.originalName)}>
            Undo rename
          </button>
        )}
      </div>
    );
  }
  return (
    <form className="filename-editor" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { onRename(name.trim()); setEditing(false); } }}>
      <label className="field-label">
        Proposed export name
        <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoFocus disabled={busy} />
      </label>
      <p className="field-hint">Current: {record.exportName}. Confirm the sheet number; only the exported filename changes.</p>
      <div className="action-row">
        <button type="button" className="button secondary sm" onClick={() => setEditing(false)}>Cancel</button>
        <button type="submit" className="button primary sm" disabled={busy || !name.trim()}>Accept name</button>
      </div>
    </form>
  );
}

export function FilesPanel(props: Props) {
  const { items, summary, busy, exporting, guided, highlightedId } = props;
  const picker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [skippedNotice, setSkippedNotice] = useState('');
  const samplePlan = items.find((item) => item.demo && /^A101/.test(item.record.originalName));
  const renamed = samplePlan && !samplePlan.record.exportName.includes('&');
  const corrected = samplePlan?.record.pages.some((page) => page.widthInches > page.heightInches);

  useEffect(() => {
    if (folderPicker.current) {
      folderPicker.current.setAttribute('webkitdirectory', '');
      folderPicker.current.setAttribute('directory', '');
    }
  }, []);

  function addFilteredFromBatch(selected: File[], filterNonPdf: boolean) {
    const sorted = [...selected].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!filterNonPdf) {
      setSkippedNotice('');
      props.onAdd(sorted);
      return;
    }
    const pdfs = sorted.filter(isPdfFile);
    const skipped = sorted.length - pdfs.length;
    setSkippedNotice(skipped > 0 ? `Skipped ${skipped} non-PDF ${skipped === 1 ? 'file' : 'files'} from the selection.` : '');
    if (pdfs.length) props.onAdd(pdfs);
  }

  return (
    <>
      {guided && (
        <section className="guided-card surface-card" aria-label="Guided sample checklist">
          <div>
            <h2>Sample exercise</h2>
            <p>Fix the floor-plan filename and portrait orientation, then inspect the remaining manual checks.</p>
          </div>
          <ol>
            <li className={renamed ? 'is-done' : ''}><span>{renamed ? '✓' : '1'}</span>Review and accept the floor-plan filename</li>
            <li className={corrected ? 'is-done' : ''}><span>{corrected ? '✓' : '2'}</span>Use the corrected landscape sample PDF</li>
            <li><span>3</span>{summary.formatChecksComplete ? 'Next: review manual and unassessed items' : 'Review remaining manual and unassessed items'}</li>
          </ol>
        </section>
      )}

      <section className="panel surface-card">
        <div className="panel-heading">
          <div>
            <h2>Drawing &amp; document schedule</h2>
          </div>
          <span className="panel-meta">{items.length} {items.length === 1 ? 'file' : 'files'}</span>
        </div>

        <div
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (busy) return;
            const hasDirectory = Array.from(event.dataTransfer.items ?? []).some((item) => item.webkitGetAsEntry?.()?.isDirectory);
            void collectDroppedFiles(event.dataTransfer).then((files) => addFilteredFromBatch(files, hasDirectory));
          }}
        >
          <div className="drop-zone-lead">
            <div>
              <h3>{items.length ? 'Add PDFs or a project folder' : 'Add your project PDFs or folder'}</h3>
              <p>PDFs only, up to 20 files, 25 MB per file (100 MB total). Originals remain untouched.</p>
            </div>
          </div>
          <div className="drop-zone-actions">
            <button type="button" className="button secondary" disabled={busy} onClick={() => picker.current?.click()}>
              Choose PDF files
            </button>
            <button type="button" className="button secondary" disabled={busy} onClick={() => folderPicker.current?.click()}>
              Choose folder
            </button>
          </div>
        </div>

        <input hidden type="file" ref={picker} multiple accept=".pdf,application/pdf" aria-label="Add project PDFs" onChange={(event) => { addFilteredFromBatch(Array.from(event.target.files ?? []), false); event.target.value = ''; }} />
        <input hidden type="file" ref={folderPicker} multiple aria-label="Add project folder" onChange={(event) => { addFilteredFromBatch(Array.from(event.target.files ?? []), true); event.target.value = ''; }} />
        <input hidden type="file" ref={replacement} accept=".pdf,application/pdf" aria-label="Replacement PDF" onChange={(event) => { const file = event.target.files?.[0]; if (file && replaceId.current) props.onReplace(replaceId.current, file); event.target.value = ''; }} />

        {skippedNotice && <p className="field-hint" role="status">{skippedNotice}</p>}
        <p className="classification-hint">
          <strong>Plan</strong> is a drawing sheet. <strong>Supporting document</strong> covers multi-page forms, checklists, and reports.
        </p>

        {!items.length && (
          <div className="empty-state">
            <h3>No project PDFs added yet</h3>
            <p>Add permit plan sheets or an exported project folder to inspect dimensions, filenames, and extracted project values.</p>
            <div className="action-row">
              <button type="button" className="button primary" disabled={busy} onClick={() => picker.current?.click()}>
                Add project PDFs
              </button>
            </div>
          </div>
        )}

        <div className="file-list">
          {items.map(({ record, demo }, idx) => {
            const count = summary.findings.filter((finding) => finding.fileId === record.id && finding.category === 'fix').length;
            const first = record.pages[0];
            const isRenamed = record.exportName !== record.originalName;
            const statusTone = record.status === 'analyzing'
              ? 'badge-info'
              : record.status !== 'complete' || count > 0
                ? 'badge-warning'
                : 'badge-green';
            return (
              <article
                id={`file-${record.id}`}
                tabIndex={-1}
                className={`file-card ${highlightedId === record.id ? 'is-highlighted' : ''}`}
                style={{ '--stagger-i': Math.min(idx, 5) } as Record<string, string | number>}
                key={record.id}
                aria-label={record.exportName}
              >
                <div className="file-heading">
                  <SheetThumb
                    widthInches={first?.widthInches}
                    heightInches={first?.heightInches}
                    kind={record.kind}
                  />
                  <div className="file-name">
                    <h3>{record.exportName}</h3>
                    <p>
                      {record.status === 'analyzing'
                        ? 'Reading PDF…'
                        : record.status === 'complete' && first
                          ? `${record.pages.length} ${record.pages.length === 1 ? 'page' : 'pages'}, ${first.widthInches.toFixed(1)} × ${first.heightInches.toFixed(1)} in`
                          : 'Contents not assessed'}, {sizeLabel(record.bytes)}, Revision {record.revision}
                      {isRenamed ? ` (originally ${record.originalName})` : ''}
                    </p>
                  </div>
                  <span className={`pill-badge ${statusTone}`}>
                    {record.status === 'analyzing' ? 'Processing' : record.status !== 'complete' ? 'Needs attention' : count ? `${count} ${count === 1 ? 'fix' : 'fixes'}` : 'Checked'}
                  </span>
                </div>

                {record.error && <p className="error-text">{record.error}</p>}

                <div className="file-controls">
                  <div className="file-controls-left">
                    <label className="inline-label">
                      Classification
                      <select aria-label={`File type for ${record.originalName}`} disabled={busy} value={record.kind} onChange={(event) => props.onClassify(record.id, event.target.value as FileKind)}>
                        <option value="plan">Plan</option>
                        <option value="supporting">Supporting document</option>
                      </select>
                    </label>
                    <FilenameEditor key={`${record.revision}-${record.exportName}`} record={record} busy={busy} onRename={(name) => props.onRename(record.id, name)} />
                    {demo && /^A101/.test(record.originalName) && record.pages.some((page) => page.heightInches > page.widthInches) && (
                      <button type="button" className="button sample-action" disabled={busy} onClick={() => props.onCorrectDemo(record.id)}>
                        Use corrected sample PDF
                      </button>
                    )}
                  </div>
                  <div className="action-row file-actions-right">
                    <button type="button" className="button secondary sm has-icon" disabled={record.status !== 'complete' || exporting} onClick={() => props.onPreview(record.id)}>
                      <IconEye /> View PDF
                    </button>
                    <button type="button" className="button secondary sm has-icon" disabled={busy} onClick={() => { replaceId.current = record.id; replacement.current?.click(); }}>
                      <IconReplace /> Replace
                    </button>
                    <button type="button" className="button ghost danger sm has-icon file-remove-btn" disabled={exporting} onClick={() => props.onRemove(record.id)}>
                      <IconTrash /> Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="panel-footer">
          <p className="muted small">Changes automatically recalculate file and set-level checks.</p>
          <button type="button" className="button primary" disabled={!items.length || busy} onClick={props.onContinue}>
            Fix &amp; review
          </button>
        </div>
      </section>
    </>
  );
}
