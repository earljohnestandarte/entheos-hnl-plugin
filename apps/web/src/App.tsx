import { useEffect, useRef, useState } from 'react';
import type { FindingCategory } from '@hnl/contracts';
import { usePreparationSession } from './hooks/usePreparationSession';
import { Onboarding, type SetupChoice, type StartPath } from './components/Onboarding';
import { StepNavigation, type WorkspaceStep } from './components/StepNavigation';
import { PreparationSummary } from './components/PreparationSummary';
import { FilesPanel } from './components/FilesPanel';
import { FindingsPanel } from './components/FindingsPanel';
import { HandoffPanel } from './components/HandoffPanel';
import { HelpDialog } from './components/HelpDialog';
import { PdfPreview } from './components/PdfPreview';

const stepCopy: Record<WorkspaceStep, { title: string; detail: string }> = {
  setup: { title: 'Preparation set', detail: 'Edit this session’s name and settings.' },
  files: { title: 'Files', detail: 'Add PDF exports and confirm their classification.' },
  findings: { title: 'Findings', detail: 'File issues first. Manual checks remain separate.' },
  handoff: { title: 'CivCheck handoff', detail: 'Practice file order, document assignments, and evidence review.' },
};

export default function App() {
  const session = usePreparationSession();
  const [started, setStarted] = useState(false);
  const [path, setPath] = useState<StartPath>('sample');
  const [step, setStep] = useState<WorkspaceStep>('files');
  const [help, setHelp] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [preview, setPreview] = useState<{ id: string; page: number } | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<FindingCategory | 'all'>('all');
  const [setupName, setSetupName] = useState('My preparation set');
  const [setupError, setSetupError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const starting = useRef(false);
  const selected = session.items.find((item) => item.record.id === preview?.id);

  useEffect(() => {
    if (started) heading.current?.focus();
  }, [started, step]);

  async function start(choice: SetupChoice) {
    if (starting.current) return;
    starting.current = true;
    session.setProjectName(choice.name);
    setSetupName(choice.name);
    setPath(choice.path);
    try {
      if (choice.path === 'sample' && !await session.loadDemo()) return;
      setStarted(true);
      setStep('files');
    } finally { starting.current = false; }
  }

  function navigate(next: WorkspaceStep) {
    if (next === 'setup') setSetupName(session.projectName);
    setStep(next);
  }

  function editFile(id: string) {
    setHighlightedId(id);
    setStep('files');
    requestAnimationFrame(() => {
      const element = document.getElementById(`file-${id}`);
      element?.scrollIntoView({ block: 'center' });
      element?.focus();
    });
  }

  function reset() {
    session.clear();
    setStarted(false);
    setPath('sample');
    setStep('files');
    setSetupName('My preparation set');
    setSetupError('');
    setClearConfirm(false);
    setPreview(null);
    setHighlightedId(null);
    setFindingFilter('all');
  }

  return <>
    <a className="skip-link" href="#main">Skip to workspace</a>
    <header className="topbar"><div className="topbar-inner">
      <a className="brand" href="#main" aria-label="EntheosIT Preflight home"><img className="brand-logo" src="/entheos-logo.png" alt="EntheosIT" /><span className="brand-divider" aria-hidden="true" /><strong>Preflight</strong><span className="brand-description">Honolulu permit PDF preparation</span></a>
      <div className="header-actions"><button type="button" className="button ghost sm" onClick={() => setHelp(true)}>How it works</button></div>
    </div></header>
    <main id="main" className="app-main">
      {!started ? <Onboarding initialName={setupName} initialPath={path} busy={session.busy} error={session.error} onStart={start} /> : <>
        <div className="page-heading">
          <div>
            <p className="page-context"><span>{session.projectName}</span></p>
            <h1 ref={heading} tabIndex={-1}>{stepCopy[step].title}</h1>
            <p>{stepCopy[step].detail}</p>
          </div>
        </div>
        <StepNavigation current={step} hasFiles={session.items.length > 0} fixCount={session.summary.fixCount} onNavigate={navigate} />
        {session.error && <div className="alert error" role="alert">{session.error}</div>}
        {session.notice && <div className="alert success" role="status">{session.notice}</div>}
        <div className="content-grid"><div className="main-column">
          {step === 'setup' && <section className="panel surface-card"><div className="panel-heading"><div><h2>Set details</h2><p className="muted">Practice locally with synthetic or approved test PDFs.</p></div></div><form className="setup-workspace" onSubmit={(event) => { event.preventDefault(); if (!setupName.trim()) { setSetupError('Give your preparation set a name.'); return; } session.setProjectName(setupName.trim()); setSetupError(''); setStep('files'); }}><label className="field-label" htmlFor="workspace-name">Preparation set name</label><input id="workspace-name" maxLength={100} value={setupName} disabled={session.busy} onChange={(event) => setSetupName(event.target.value)} /><p className="field-hint">Changing this label does not remove or reclassify your files.</p><div className="setup-selection"><span>Starting point</span><strong>{path === 'sample' ? 'Guided synthetic sample' : 'Your test PDFs'}</strong></div><div className="notice"><strong>This session is not saved.</strong><p>Files stay in browser memory only. Refresh clears the workspace; source files and downloaded copies are not changed. No scope or compliance validation is performed.</p></div>{setupError && <p role="alert" className="error-text">{setupError}</p>}<div className="action-row"><button className="button primary" disabled={session.busy}>Continue to files</button></div></form></section>}
          {step === 'files' && <FilesPanel items={session.items} summary={session.summary} busy={session.busy} exporting={session.exporting} guided={path === 'sample'} highlightedId={highlightedId} onAdd={(files) => { void session.addFiles(files); }} onReplace={(id, file) => { void session.replaceFile(id, file); }} onRename={session.rename} onClassify={session.classify} onRemove={(id) => { setPreview(null); session.remove(id); }} onPreview={(id) => setPreview({ id, page: 1 })} onCorrectDemo={(id) => { void session.correctDemo(id); }} onContinue={() => { setFindingFilter('all'); setStep('findings'); }} />}
          {step === 'findings' && <FindingsPanel key={findingFilter} items={session.items} summary={session.summary} onPreview={(id, page) => setPreview({ id, page })} onEditFile={editFile} onContinue={() => setStep('handoff')} initialFilter={findingFilter} />}
          {step === 'handoff' && <HandoffPanel items={session.items} summary={session.summary} busy={session.busy} exporting={session.exporting} onExport={() => { void session.exportPackage(); }} onBack={() => setStep('findings')} onPreview={(id, page) => setPreview({ id, page })} />}
          <div className="workspace-reset">{clearConfirm ? <div className="notice reset-confirm"><strong>Clear this workspace and start again?</strong><p>All files and findings in this session will be removed. Originals and downloads stay unchanged.</p><div className="action-row reset-actions"><button className="button secondary danger-outline" disabled={session.exporting} onClick={reset}>Clear and start again</button><button className="button primary" onClick={() => setClearConfirm(false)}>Keep working</button></div></div> : <button className="button ghost sm" disabled={session.exporting} onClick={() => setClearConfirm(true)}>Start a new preparation set</button>}</div>
        </div><PreparationSummary summary={session.summary} fileCount={session.items.length} working={session.working} onCoverage={() => { setFindingFilter('not-assessed'); setStep('findings'); }} /></div>
      </>}
      <footer className="footer"><span><a href="https://entheosit.com/" target="_blank" rel="noreferrer">EntheosIT</a> Preflight, local browser preparation</span><span>© 2026 Entheos Inc. Not affiliated with Honolulu DPP or Clariti. Files remain in this tab and are not uploaded.</span></footer>
    </main>
    {help && <HelpDialog onClose={() => setHelp(false)} />}
    {selected && preview && <PdfPreview key={`${selected.record.id}-${selected.record.revision}`} record={selected.record} file={selected.file} initialPage={preview.page} onClose={() => setPreview(null)} />}
  </>;
}
