import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeDocuments, suggestFilename } from '@hnl/core';
import { DEMO_RULE_PACK, LIMITS, type DocumentRecord, type FileKind, type FindingCategory } from '@hnl/contracts';
import { readPdf, UnsupportedPdfError } from './lib/pdf';
import type { SourceDocument } from './lib/export';
import { PdfPreview } from './components/PdfPreview';

type Tab = 'files' | 'findings' | 'handoff';
type Item = SourceDocument & { demo: boolean };
const categoryLabels: Record<FindingCategory, string> = { fix: 'Fix before CivCheck', review: 'Review before CivCheck', advisory: 'Helpful suggestions', 'not-assessed': 'Not assessed by this tool' };
const categories: FindingCategory[] = ['fix', 'review', 'advisory', 'not-assessed'];
const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

function Brand() {
  return <a className="brand" href="#main" aria-label="HNL Preflight home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m5 15 11-10 11 10v13H5Z"/><path d="m11 17 4 4 8-9"/></svg></span><span>HNL <strong>Preflight</strong><small>PERMIT PREPARATION</small></span></a>;
}

function RenameEditor({ record, disabled, onSave }: { record: DocumentRecord; disabled: boolean; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(record.exportName);
  if (!editing) return <button className="text-button" disabled={disabled} onClick={() => { setName(suggestFilename(record.exportName, record.kind)); setEditing(true); }}>Review filename</button>;
  return <form className="rename-editor" onSubmit={(event) => { event.preventDefault(); onSave(name.trim()); setEditing(false); }}>
    <label>Proposed export name<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoFocus /></label>
    <small>Original stays unchanged. Check the sheet number before accepting.</small>
    <div className="button-row"><button type="submit" disabled={disabled || !name.trim()}>Accept name</button><button type="button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const generation = useRef(0);
  const operation = useRef<symbol | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const [tab, setTab] = useState<Tab>('files');
  const [projectName, setProjectName] = useState('My preparation set');
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<FindingCategory | 'all'>('all');
  const [preview, setPreview] = useState<{ id: string; page: number } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const records = items.map((item) => item.record);
  const summary = useMemo(() => analyzeDocuments(items.map((item) => item.record)), [items]);
  const busy = working || exporting;
  const selected = items.find((item) => item.record.id === preview?.id);

  function changeItems(update: (previous: Item[]) => Item[]) {
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (itemsRef.current.length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); controllers.current.forEach((controller) => controller.abort()); };
  }, []);

  async function analyze(item: Item, epoch: number) {
    const controller = new AbortController();
    controllers.current.set(item.record.id, controller);
    try {
      const result = await readPdf(item.file, controller.signal);
      if (generation.current !== epoch || controller.signal.aborted) return;
      changeItems((previous) => previous.map((entry) => entry.record.id === item.record.id && entry.record.revision === item.record.revision
        ? { ...entry, record: { ...entry.record, ...result, status: 'complete' } } : entry));
    } catch (failure) {
      if (generation.current !== epoch || controller.signal.aborted) return;
      const unsupported = failure instanceof UnsupportedPdfError;
      changeItems((previous) => previous.map((entry) => entry.record.id === item.record.id && entry.record.revision === item.record.revision
        ? { ...entry, record: { ...entry.record, status: unsupported ? 'unsupported' : 'error', error: unsupported ? failure.message : 'The PDF could not be fully read. Re-export it from the source application; this file has not been assessed.', pages: [] } } : entry));
    } finally {
      if (controllers.current.get(item.record.id) === controller) controllers.current.delete(item.record.id);
    }
  }

  async function addFiles(files: File[], demo = false, heldOperation?: symbol) {
    if (!files.length || exporting || (operation.current !== null && operation.current !== heldOperation)) return;
    setError(''); setNotice('');
    const current = itemsRef.current;
    if (current.length + files.length > LIMITS.maxFiles) { setError('This prototype supports up to 20 files. Remove a file before adding more.'); return; }
    if (files.some((file) => file.size > LIMITS.maxFileBytes)) { setError('Each file must be 25 MB or smaller. No files from this selection were added.'); return; }
    if (current.reduce((sum, item) => sum + item.file.size, 0) + files.reduce((sum, file) => sum + file.size, 0) > LIMITS.maxTotalBytes) { setError('The preparation set must be 100 MB or smaller. No files from this selection were added.'); return; }
    const token = heldOperation ?? Symbol('add');
    operation.current = token;
    const epoch = generation.current;
    const additions: Item[] = files.map((file) => ({ file, demo, record: { id: crypto.randomUUID(), revision: 1, originalName: file.name, exportName: file.name, kind: /support|form|escp|rswmp/i.test(file.name) ? 'supporting' : 'plan', bytes: file.size, hash: '', status: 'analyzing', pages: [] } }));
    changeItems((previous) => [...previous, ...additions]);
    setWorking(true);
    try {
      for (const item of additions) {
        if (epoch !== generation.current) break;
        if (itemsRef.current.some((entry) => entry.record.id === item.record.id)) await analyze(item, epoch);
      }
      if (epoch === generation.current) setNotice('File analysis finished. Review classification, findings, and the checks we do not assess.');
    } finally { if (operation.current === token) { operation.current = null; setWorking(false); } }
  }

  async function replaceFile(id: string, file: File, heldOperation?: symbol) {
    const previous = itemsRef.current.find((item) => item.record.id === id);
    if (!previous || exporting || (operation.current !== null && operation.current !== heldOperation)) return;
    if (file.size > LIMITS.maxFileBytes || itemsRef.current.reduce((sum, item) => sum + item.file.size, 0) - previous.file.size + file.size > LIMITS.maxTotalBytes) { setError('Replacement exceeds the prototype file or set size limit.'); return; }
    const token = heldOperation ?? Symbol('replace');
    operation.current = token;
    setError(''); setNotice(''); setPreview(null);
    controllers.current.get(id)?.abort();
    const replacement: Item = { ...previous, file, record: { ...previous.record, revision: previous.record.revision + 1, originalName: file.name, exportName: file.name, bytes: file.size, pages: [], hash: '', status: 'analyzing', error: undefined } };
    changeItems((all) => all.map((item) => item.record.id === id ? replacement : item));
    setWorking(true);
    const epoch = generation.current;
    try { await analyze(replacement, epoch); if (epoch === generation.current) setNotice('Replacement analyzed. File checks and all set-level findings were recalculated.'); }
    finally { if (operation.current === token) { operation.current = null; setWorking(false); } }
  }

  async function loadDemo() {
    if (operation.current || exporting) return;
    const token = Symbol('sample');
    const epoch = generation.current;
    operation.current = token; setWorking(true); setError('');
    try {
      const { createDemoFiles } = await import('./lib/demo');
      const files = await createDemoFiles();
      if (generation.current !== epoch || operation.current !== token) return;
      if (!itemsRef.current.length) setProjectName('Example renovation · synthetic demo');
      await addFiles(files, true, token);
    } catch { if (generation.current === epoch) setError('The synthetic demo could not be generated. Please try again.'); }
    finally { if (operation.current === token) { operation.current = null; setWorking(false); } }
  }

  async function correctDemo(id: string) {
    if (operation.current || exporting) return;
    const revision = itemsRef.current.find((item) => item.record.id === id)?.record.revision;
    if (revision === undefined) return;
    const token = Symbol('correct-sample');
    const epoch = generation.current;
    operation.current = token; setWorking(true);
    try {
      const { createCorrectedPlan } = await import('./lib/demo');
      const file = await createCorrectedPlan();
      if (generation.current !== epoch || operation.current !== token || itemsRef.current.find((item) => item.record.id === id)?.record.revision !== revision) return;
      await replaceFile(id, file, token);
    } catch { if (generation.current === epoch) setError('The corrected synthetic PDF could not be generated.'); }
    finally { if (operation.current === token) { operation.current = null; setWorking(false); } }
  }

  function remove(id: string) {
    controllers.current.get(id)?.abort();
    changeItems((all) => all.filter((item) => item.record.id !== id));
    setPreview(null); setNotice('File removed. Set-level checks updated.');
  }

  function clear() {
    generation.current++;
    operation.current = null;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    changeItems(() => []); setWorking(false); setPreview(null); setClearConfirm(false); setError(''); setNotice('Session cleared. Downloaded copies, if any, are not deleted.'); setTab('files');
  }

  async function exportPackage() {
    if (operation.current || exporting) return;
    const token = Symbol('export');
    operation.current = token;
    setExporting(true); setError(''); setNotice('');
    const snapshot = itemsRef.current.map((item) => ({ file: item.file, record: { ...item.record } }));
    try {
      const { buildPackage, downloadBytes } = await import('./lib/export');
      const bytes = await buildPackage(projectName, snapshot, analyzeDocuments(snapshot.map((item) => item.record)).findings);
      downloadBytes(bytes, 'HNL-prescreen-demo-package.zip', 'application/zip');
      setNotice('Package downloaded. Extract the ZIP; upload only the intended files in upload/. Keep reference/ for your own use.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The package could not be created.'); }
    finally { if (operation.current === token) operation.current = null; setExporting(false); }
  }

  return <>
    <a className="skip-link" href="#main">Skip to workspace</a>
    <header className="topbar"><div className="topbar-inner"><Brand /><div className="header-right"><span className="local-badge"><i /> Local processing</span><span className="prototype-label">PROTOTYPE 0.1</span></div></div></header>
    <div className="demo-banner"><strong>Synthetic-data prototype</strong><span>Not for client plans yet. Demonstration rules are not verified for current submissions.</span></div>
    <main id="main" className="workspace">
      <div className="page-heading"><div><div className="eyebrow">BEFORE CIVCHECK</div><h1>A smoother start to<br className="mobile-break" /> your permit review.</h1><p>Catch avoidable issues. Prepare your files. Know what comes next.</p></div><div className="session-note"><span className="session-icon" aria-hidden="true">⌁</span><div><strong>One session. On your device.</strong><span>No upload or autosave. Refresh clears this workspace.</span></div></div></div>
      <nav className="step-nav" aria-label="Preparation steps">{([['files', '01', 'Prepare files'], ['findings', '02', 'Review findings'], ['handoff', '03', 'CivCheck handoff']] as const).map(([id, number, label]) => <button key={id} className={tab === id ? 'step active' : 'step'} aria-current={tab === id ? 'step' : undefined} onClick={() => setTab(id)}><span className="step-number">{number}</span><span>{label}</span>{id === 'findings' && items.length > 0 && summary.fixCount > 0 && <span className="count-badge">{summary.fixCount}</span>}</button>)}</nav>
      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}
      <div className="content-grid"><section className="main-column" aria-label="Preparation workspace">
        {tab === 'files' && <>
          <section className="panel upload-panel"><div className="section-heading"><div><h2>Your plan set</h2><p>Start with PDFs exported from your design application.</p></div><span className="subtle-tag">PDF ONLY</span></div>
            <div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}>
              <span className="upload-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M14 7h14l9 9v25H11V7Z"/><path d="M28 7v10h9M24 34V23m-5 5 5-5 5 5"/></svg></span><h3>Drop your test PDFs here</h3><p>Up to 20 files · 25 MB per file · 100 MB total</p><button className="primary" disabled={busy} onClick={() => fileInput.current?.click()}>Choose PDF files <span aria-hidden="true">↗</span></button><span className="drop-note">Files stay in this browser tab.</span>
            </div>
            <input className="visually-hidden" ref={fileInput} type="file" accept=".pdf,application/pdf" multiple aria-label="Choose PDF files" onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
            <input className="visually-hidden" ref={replaceInput} type="file" accept=".pdf,application/pdf" aria-label="Choose replacement PDF" onChange={(event) => { const file = event.target.files?.[0]; if (file && replaceTarget.current) void replaceFile(replaceTarget.current, file); event.target.value = ''; }} />
            <div className="demo-callout"><span><strong>No test plans handy?</strong> Explore a synthetic set with a few issues to fix.</span><button className="text-button" disabled={busy || items.length > 0} onClick={() => void loadDemo()}>Load sample set <span aria-hidden="true">→</span></button></div>
          </section>
          {items.length > 0 && <section className="panel files-panel"><div className="section-heading"><div><h2>Files <span className="heading-count">{items.length}</span></h2><p>Confirm Plan or Supporting document before reviewing results.</p></div><span className="muted small">{formatSize(items.reduce((sum, item) => sum + item.file.size, 0))} total</span></div>
            <label className="project-name">Preparation set name<input maxLength={100} value={projectName} disabled={exporting} onChange={(event) => setProjectName(event.target.value)} /></label>
            <div className="file-list">{items.map(({ record, demo }) => {
              const fixes = summary.findings.filter((finding) => finding.fileId === record.id && finding.category === 'fix').length;
              return <article className="file-card" key={record.id}><div className="file-heading"><span className="pdf-icon" aria-hidden="true">PDF</span><div className="file-title"><h3>{record.exportName}</h3><p>{record.status === 'analyzing' ? 'Reading PDF…' : record.status === 'complete' ? `${record.pages.length} ${record.pages.length === 1 ? 'page' : 'pages'} · ${record.pages[0]?.widthInches.toFixed(1)} × ${record.pages[0]?.heightInches.toFixed(1)} in` : 'Not assessed'} · {formatSize(record.bytes)} · rev {record.revision}</p></div><span className={`file-status ${fixes ? 'needs-fix' : ''}`}>{record.status === 'analyzing' ? 'Processing' : record.status !== 'complete' ? 'Needs review' : fixes ? `${fixes} ${fixes === 1 ? 'fix' : 'fixes'}` : 'Read'}</span></div>
                {record.error && <p className="file-error">{record.error}</p>}
                <div className="file-actions"><label className="classification">File type<select value={record.kind} disabled={busy} aria-label={`File type for ${record.originalName}`} onChange={(event) => changeItems((all) => all.map((item) => item.record.id === record.id ? { ...item, record: { ...item.record, kind: event.target.value as FileKind } } : item))}><option value="plan">Plan</option><option value="supporting">Supporting document</option></select></label><div className="file-buttons"><button disabled={record.status !== 'complete' || exporting} onClick={() => setPreview({ id: record.id, page: 1 })}>View PDF</button><button disabled={busy} onClick={() => { replaceTarget.current = record.id; replaceInput.current?.click(); }}>Replace</button><button className="quiet" disabled={exporting} onClick={() => remove(record.id)}>Remove</button></div></div>
                <div className="rename-row"><RenameEditor key={`${record.revision}-${record.exportName}`} record={record} disabled={busy} onSave={(name) => changeItems((all) => all.map((item) => item.record.id === record.id ? { ...item, record: { ...item.record, exportName: name } } : item))} />{record.exportName !== record.originalName && <><small>Original: {record.originalName}</small><button className="text-button" disabled={busy} onClick={() => changeItems((all) => all.map((item) => item.record.id === record.id ? { ...item, record: { ...item.record, exportName: record.originalName } } : item))}>Undo rename</button></>}
                {demo && /^A101/.test(record.originalName) && record.pages.some((page) => page.heightInches > page.widthInches) && <button className="text-button demo-fix" disabled={busy} onClick={() => void correctDemo(record.id)}>Use corrected sample PDF →</button>}</div>
              </article>;
            })}</div><div className="panel-footer"><span className="small muted">Replacing a file recalculates the complete set.</span><button className="primary" onClick={() => setTab('findings')}>Review findings →</button></div>
          </section>}
          {!items.length && <div className="principles"><div><span>01</span><h3>Catch the preventable</h3><p>Names, sheet sizes, orientation, and page counts.</p></div><div><span>02</span><h3>Fix with confidence</h3><p>See the issue, the source, and your next action.</p></div><div><span>03</span><h3>Arrive prepared</h3><p>Keep upload files separate from your reference guide.</p></div></div>}
        </>}
        {tab === 'findings' && <section className="panel findings-panel"><div className="section-heading"><div><h2>Your preparation checklist</h2><p>A prescreen, not a prediction of CivCheck’s decision.</p></div></div>{!items.length ? <div className="empty-state"><h3>Add a plan set first</h3><p>We’ll separate actionable findings from manual reviews and things we cannot assess.</p><button onClick={() => setTab('files')}>Prepare files →</button></div> : <><div className="filter-tabs" aria-label="Filter findings"><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All findings</button>{categories.map((category) => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category === 'fix' ? 'Fix' : category === 'review' ? 'Review' : category === 'advisory' ? 'Advice' : 'Not assessed'} <span>{summary.findings.filter((finding) => finding.category === category).length}</span></button>)}</div>{categories.filter((category) => filter === 'all' || category === filter).map((category) => {
            const findings = summary.findings.filter((finding) => finding.category === category);
            return <section className="finding-group" key={category}><h3><span className={`status-dot ${category}`} />{categoryLabels[category]} <small>{findings.length}</small></h3>{!findings.length ? <p className="no-findings">No findings in this category.</p> : findings.map((finding) => {
              const item = items.find((entry) => entry.record.id === finding.fileId);
              return <article className={`finding-card ${category}`} key={finding.id}><h4>{finding.title}</h4>{item && <div className="finding-file">{item.record.exportName}{finding.page ? ` · page ${finding.page}` : ''} · rev {item.record.revision}</div>}<p>{finding.detail}</p><div className="fix-hint"><strong>Next action</strong><span>{finding.action}</span></div><details><summary>Rule source and coverage</summary><p>{finding.source}</p><p>Demonstration pack {DEMO_RULE_PACK.version}. Not independently verified for current submissions.</p></details>{item?.record.status === 'complete' && <button className="text-button" onClick={() => setPreview({ id: item.record.id, page: finding.page ?? 1 })}>Open source PDF ↗</button>}</article>;
            })}</section>;
          })}<div className="panel-footer"><button onClick={() => setTab('files')}>← Back to files</button><button className="primary" onClick={() => setTab('handoff')}>Prepare handoff →</button></div></>}</section>}
        {tab === 'handoff' && <section className="panel handoff-panel"><div className="section-heading"><div><h2>Make your next step simpler.</h2><p>Your preparation bundle, organized for a human handoff.</p></div></div><div className="handoff-note"><strong>Prepared for review. Not approved.</strong><p>{items.length ? summary.label : 'Add PDFs to build your package.'} Manual reviews and all CivCheck checks still apply. This demo never issues a certificate or watermarked plans.</p></div><div className="package-layout"><div><span className="folder-icon" aria-hidden="true">▱</span><h3>upload/</h3><span className="subtle-tag">SOURCE PDFS</span><p>Plans and supporting documents with your accepted filenames. Original content stays unchanged.</p></div><div><span className="folder-icon" aria-hidden="true">▤</span><h3>reference/</h3><span className="subtle-tag">FOR YOU, NOT UPLOAD</span><p>A preparation report, findings, manifest, and step-by-step guide. These do not replace required forms.</p></div></div><ol className="handoff-steps"><li><strong>Extract and review the package</strong><span>The ZIP is a local convenience. Direct ZIP import into CivCheck is not assumed.</span></li><li><strong>Upload the intended source files</strong><span>Review Plan / Other classification and assign the required document types in CivCheck.</span></li><li><strong>Confirm values, highlights, and answers</strong><span>Use your source plans as evidence. This slice does not extract a verified answer bank or transmit highlights.</span></li><li><strong>Complete CivCheck’s own review</strong><span>Answer attestations yourself. Fix any additional findings and re-upload as needed.</span></li></ol>
          <div className="export-box"><div><h3>Download preparation package</h3><p>{summary.fixCount ? `${summary.fixCount} preparation issues remain. The report will list them as unresolved.` : 'Manual reviews and unassessed checks remain in the report.'} Downloads are unencrypted and stay on your device.</p></div><button className="primary" disabled={busy || !items.length || records.some((record) => record.status !== 'complete')} onClick={() => void exportPackage()}>{exporting ? 'Building package…' : 'Download ZIP ↓'}</button></div>{items.some((item) => item.record.status !== 'complete') && <p className="file-error">Resolve or remove unreadable/pending files before exporting. Nothing is silently omitted.</p>}</section>}
      </section><aside className="sidebar" aria-label="Preparation overview"><section className="summary-card"><span className="eyebrow">PREFLIGHT SUMMARY</span><div className="summary-symbol" aria-hidden="true">{items.length ? (summary.formatChecksComplete ? '✓' : '!') : '↗'}</div><h2>{!items.length ? 'A little preparation.\nFewer surprises.' : working ? 'Checking your files…' : summary.pendingCount ? 'Some files need attention.' : summary.fixCount ? 'A few things to fix.' : 'Keep the review moving.'}</h2><p>{!items.length ? 'Start with a sample set to see how prescreening works.' : summary.label}</p><div className="summary-stat"><span>Files in this set</span><strong>{items.length}</strong></div><div className="summary-stat"><span>Preparation fixes</span><strong>{items.length ? summary.fixCount : '—'}</strong></div><div className="summary-stat"><span>Manual reviews</span><strong>{items.length ? summary.reviewCount : '—'}</strong></div><div className="summary-bottom">{working ? 'Reading one PDF at a time…' : 'Only covered checks are evaluated. A completed prescreen is not CivCheck approval.'}</div></section>
        <section className="coverage-card"><h3>What this slice checks</h3><ul><li>Filename format and collisions</li><li>Sheet size and orientation</li><li>Plan page counts and title filename</li><li>Text-layer availability</li></ul><h3>Still needs human review</h3><p>Document completeness, stamp space, title-block evidence, values, signatures, and design/code compliance.</p><a href="#coverage" onClick={(event) => { event.preventDefault(); setTab('findings'); setFilter('not-assessed'); }}>Understand the limits ↗</a></section>
        {items.length > 0 && <div className="clear-session">{clearConfirm ? <><p>Clear this session? Files and findings cannot be restored. Originals and downloads are unchanged.</p><div className="button-row"><button disabled={exporting} onClick={clear}>Clear session</button><button onClick={() => setClearConfirm(false)}>Keep working</button></div></> : <button className="text-button" disabled={exporting} onClick={() => setClearConfirm(true)}>Clear workspace</button>}</div>}
      </aside></div>
      <footer className="footer"><span>HNL Preflight · Independent preparation tool</span><span>Not affiliated with Honolulu DPP or Clariti. No approval guarantee.</span></footer>
    </main>
    {selected && preview && <PdfPreview key={`${selected.record.id}-${selected.record.revision}`} record={selected.record} file={selected.file} initialPage={preview.page} onClose={() => setPreview(null)} />}
  </>;
}
