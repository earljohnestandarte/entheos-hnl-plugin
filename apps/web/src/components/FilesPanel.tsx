import { useEffect, useRef, useState } from 'react';
import type { CheckSummary, DocumentRecord, FileKind, Finding } from '@hnl/contracts';
import { IconAlert, IconCheck, IconEye, IconReplace, IconTrash, SheetThumb } from './Icons';
import { FilenameValidatorEditor } from './FilenameValidatorEditor';
import { fileVerificationKey, validateDocumentChecks } from '../lib/exportNames';
import { handoffFiles } from '../lib/handoffFiles';

interface FileItem { record: DocumentRecord; demo: boolean }
interface Props {
  items: FileItem[]; summary: CheckSummary; busy: boolean; exporting: boolean; highlightedId: string | null;
  onLoadSample: () => void;
  onAdd: (files: File[]) => void; onReplace: (id: string, file: File) => void;
  onRename: (id: string, name: string) => void; onClassify: (id: string, kind: FileKind | 'reference') => void;
  onOmitReference: (id: string) => void;
  verifiedFileKeys?: Record<string, string>;
  onVerifyFile?: (id: string) => void;
  resolvedFixes?: Finding[];
  replacingId?: string | null;
  removedName?: string;
  onCancelReplacement: () => void;
  onUndoRemove: () => void;
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

export function FilesPanel(props: Props) {
  const { items, summary, busy, exporting, highlightedId } = props;
  const hasFiles = items.length > 0;
  const guided = items.some((item) => item.demo);
  const allRecords = items.map((item) => item.record);
  const nameRecords = handoffFiles(allRecords).included;
  const picker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [skippedNotice, setSkippedNotice] = useState('');
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({});
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
        {hasFiles && <div className="panel-heading">
          <div>
            <h2>Drawing &amp; document schedule</h2>
          </div>
          <span className="panel-meta">{items.length} {items.length === 1 ? 'file' : 'files'}</span>
        </div>}

        <div
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (busy) return;
            const hasDirectory = Array.from(event.dataTransfer.items ?? []).some((item) => item.webkitGetAsEntry?.()?.isDirectory);
            void collectDroppedFiles(event.dataTransfer).then((files) => {
              if (picker.current) addFilteredFromBatch(files, hasDirectory);
            });
          }}
        >
          <div className="drop-zone-lead">
            {hasFiles ? <h3>Add test PDFs or a folder</h3> : <h2>Drop test PDFs or a folder here</h2>}
            <p>Use synthetic or approved, de-identified PDFs for local testing. Refreshing clears the set.</p>
            <p>Up to 20 files, 25 MB per file (100 MB total).</p>
          </div>
          <div className="drop-zone-actions">
            <button type="button" className={hasFiles ? 'button secondary' : 'button primary'} disabled={busy} onClick={() => picker.current?.click()}>
              Choose PDF files
            </button>
            <button type="button" className="button secondary" disabled={busy} onClick={() => folderPicker.current?.click()}>
              Choose folder
            </button>
          </div>
        </div>

        <input hidden type="file" ref={picker} multiple accept=".pdf,application/pdf" aria-label="Add test PDFs" onChange={(event) => { addFilteredFromBatch(Array.from(event.target.files ?? []), false); event.target.value = ''; }} />
        <input hidden type="file" ref={folderPicker} multiple aria-label="Add test folder" onChange={(event) => { addFilteredFromBatch(Array.from(event.target.files ?? []), true); event.target.value = ''; }} />
        <input hidden type="file" ref={replacement} accept=".pdf,application/pdf" aria-label="Replacement PDF" onChange={(event) => { const file = event.target.files?.[0]; if (file && replaceId.current) props.onReplace(replaceId.current, file); event.target.value = ''; }} />

        {skippedNotice && <p className="field-hint" role="status">{skippedNotice}</p>}
        {props.removedName && <div className="notice">
          <span>Removed {props.removedName}.</span>{' '}
          <button type="button" className="button ghost sm" disabled={busy} onClick={props.onUndoRemove}>Undo remove</button>
        </div>}
        {hasFiles ? (
          <p className="classification-hint">
            <strong>Plan</strong> is a drawing sheet. <strong>Supporting document</strong> covers multi-page forms, checklists, and reports.
          </p>
        ) : (
          <div className="sample-entry">
            <button type="button" className="button ghost" disabled={busy} onClick={props.onLoadSample}>
              Try the guided sample
            </button>
            {busy && <span role="status">Preparing files…</span>}
          </div>
        )}

        {hasFiles && <div className="file-list">
          {items.map(({ record, demo }, idx) => {
            const fileFixes = summary.findings.filter((finding) => finding.fileId === record.id && finding.category === 'fix');
            const fileResolvedFixes = (props.resolvedFixes ?? []).filter((finding) => finding.fileId === record.id);
            const count = fileFixes.length;
            const first = record.pages[0];
            const isRenamed = record.exportName !== record.originalName;
            const isVerified = props.verifiedFileKeys?.[record.id] === fileVerificationKey(record) &&
              record.status === 'complete' && count === 0 && !record.typeReview;
            const isFixed = count === 0 && fileResolvedFixes.length > 0 && record.status === 'complete' && !record.typeReview;
            const checksOpen = Boolean(expandedChecks[record.id]);
            const validationChecks = checksOpen ? validateDocumentChecks(record, nameRecords, summary) : [];
            const statusTone = record.status === 'analyzing'
              ? 'badge-info'
              : record.status !== 'complete' || count > 0 || record.typeReview
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
                  <div className="file-badges">
                    <span className={`pill-badge ${statusTone}`}>
                      {record.status === 'analyzing' ? 'Processing' : record.status !== 'complete' ? 'Needs attention'
                        : record.typeReview ? 'Confirm type' : count ? `${count} ${count === 1 ? 'fix' : 'fixes'}`
                        : record.disposition === 'reference' ? 'Review only' : 'Checked'}
                    </span>
                    {isFixed && (
                      <span className="pill-badge badge-green verified-pill">
                        <IconCheck width={12} height={12} /> Fixed
                      </span>
                    )}
                    {isVerified && (
                      <span className="pill-badge badge-green verified-pill">
                        <IconCheck width={12} height={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>

                {record.error && <p className="error-text">{record.error}</p>}
                {record.typeReview && <p className="field-hint">{record.typeReview}</p>}
                {!record.typeReview && record.kindReason && <p className="field-hint">{record.kindReason}</p>}
                {record.omitFromPackage && <p className="field-hint">This review reference will be listed as omitted in the ZIP.</p>}
                {count > 0 && (
                  <ul className="file-fix-list" aria-label={`Open fixes for ${record.exportName}`}>
                    {fileFixes.map((finding) => (
                      <li key={finding.id}>
                        <IconAlert width={13} height={13} />
                        <span><strong>{finding.title}:</strong> {finding.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {props.replacingId === record.id && <div className="notice">
                  <span role="status">Checking replacement… The current revision is still available.</span>{' '}
                  <button type="button" className="button ghost sm" onClick={props.onCancelReplacement}>Cancel replacement</button>
                </div>}

                <div className="file-controls">
                  <div className="file-controls-left">
                    <label className="inline-label">
                      Classification
                      <select aria-label={`File type for ${record.originalName}`} disabled={busy}
                        value={record.typeReview ? '' : record.disposition === 'reference' ? 'reference' : record.kind}
                        onChange={(event) => props.onClassify(record.id, event.target.value as FileKind | 'reference')}>
                        {record.typeReview && <option value="" disabled>Confirm file type</option>}
                        <option value="plan">Plan</option>
                        <option value="supporting">Supporting document</option>
                        <option value="reference">Review-only reference</option>
                      </select>
                    </label>
                    {record.disposition === 'reference' && (record.status === 'unsupported' || record.status === 'error') && (
                      <button type="button" className="button ghost sm" disabled={busy} onClick={() => props.onOmitReference(record.id)}>
                        {record.omitFromPackage ? 'Include in ZIP' : 'Omit from ZIP'}
                      </button>
                    )}
                    <FilenameValidatorEditor key={`${record.revision}-${record.exportName}-${record.kind}-${record.disposition ?? 'source'}`} record={record}
                      records={nameRecords}
                      busy={busy} onRename={(name) => props.onRename(record.id, name)} />
                    {demo && /^A101/.test(record.originalName) && record.pages.some((page) => page.heightInches > page.widthInches) && (
                      <button type="button" className="button sample-action" disabled={busy} onClick={() => props.onCorrectDemo(record.id)}>
                        Use corrected sample PDF
                      </button>
                    )}
                  </div>
                  <div className="action-row file-actions-right">
                    <button
                      type="button"
                      className="button ghost sm"
                      disabled={busy || record.status === 'analyzing'}
                      aria-expanded={checksOpen}
                      onClick={() => {
                        if (!checksOpen) props.onVerifyFile?.(record.id);
                        setExpandedChecks((current) => ({ ...current, [record.id]: !checksOpen }));
                      }}
                    >
                      {checksOpen ? 'Hide checks' : isVerified ? 'Re-verify' : 'Verify checks'}
                    </button>
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
                {checksOpen && (
                  <div className="file-validator-panel" aria-label={`Validation checks for ${record.exportName}`}>
                    <div className="file-validator-head">
                      <strong>{count === 0 && !record.typeReview && record.status === 'complete' ? 'All covered file checks pass' : 'File check validator'}</strong>
                      <span className="muted small">Revision {record.revision}</span>
                    </div>
                    <ul className="validator-list">
                      {validationChecks.map((check) => (
                        <li key={check.id} className={`is-${check.status}`}>
                          {check.status === 'pass' ? <IconCheck width={13} height={13} /> : <IconAlert width={13} height={13} />}
                          <span><strong>{check.label}:</strong> {check.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>}

        {hasFiles && <div className="panel-footer">
          <p className="muted small">Changes automatically recalculate file and set-level checks.</p>
          <button type="button" className="button primary" disabled={busy} onClick={props.onContinue}>
            Fix &amp; review
          </button>
        </div>}
      </section>
    </>
  );
}
