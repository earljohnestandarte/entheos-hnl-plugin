import { useEffect, useRef, useState } from 'react';
import type { FindingCategory } from '@hnl/contracts';
import { DEFAULT_PROJECT_NAME, usePreparationSession } from './hooks/usePreparationSession';
import { StepNavigation, type WorkspaceStep } from './components/StepNavigation';
import { PreparationSummary } from './components/PreparationSummary';
import { FilesPanel } from './components/FilesPanel';
import { FindingsPanel } from './components/FindingsPanel';
import { HandoffPanel } from './components/HandoffPanel';
import { HelpDialog } from './components/HelpDialog';
import { PdfPreview } from './components/PdfPreview';

type WorkspaceView = WorkspaceStep | 'setup';

const stepCopy: Record<WorkspaceView, { title: string; detail?: string }> = {
  setup: { title: 'Preparation set' },
  files: { title: 'Files', detail: 'Check exported drawing sheets and supporting documents before CivCheck.' },
  findings: { title: 'Findings', detail: 'File issues first. Manual checks remain separate.' },
  handoff: { title: 'CivCheck handoff', detail: 'Practice file order, document assignments, and evidence review.' },
};

export default function App() {
  const session = usePreparationSession();
  const [step, setStep] = useState<WorkspaceView>('files');
  const [help, setHelp] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [preview, setPreview] = useState<{ id: string; page: number } | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<FindingCategory | 'all'>('all');
  const [setupName, setSetupName] = useState(session.projectName);
  const [setupError, setSetupError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef({ step, workspaceVersion });
  const renameReturnStep = useRef<WorkspaceStep>('files');
  const selected = session.items.find((item) => item.record.id === preview?.id);
  const hasFiles = session.items.length > 0;
  const showSetName = hasFiles || session.projectName !== DEFAULT_PROJECT_NAME;
  const canReset = showSetName || session.working || !!session.removedName;

  useEffect(() => {
    if (previousView.current.step === step && previousView.current.workspaceVersion === workspaceVersion) return;
    previousView.current = { step, workspaceVersion };
    heading.current?.focus();
  }, [step, workspaceVersion]);

  function openRename() {
    if (step === 'setup') return;
    renameReturnStep.current = step;
    setSetupName(showSetName ? session.projectName : '');
    setSetupError('');
    setStep('setup');
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
    setWorkspaceVersion((version) => version + 1);
    setStep('files');
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
        <div className="page-heading">
          <div>
            {(showSetName || step !== 'setup') && (
              <div className="page-context">
                {showSetName && <span>{session.projectName}</span>}
                {step !== 'setup' && (
                  <button type="button" className="button ghost sm" onClick={openRename}>
                    {showSetName ? 'Rename set' : 'Name set'}
                  </button>
                )}
              </div>
            )}
            <h1 ref={heading} tabIndex={-1}>{stepCopy[step].title}</h1>
            {stepCopy[step].detail && <p>{stepCopy[step].detail}</p>}
          </div>
        </div>
        {step !== 'setup' && <StepNavigation current={step} hasFiles={hasFiles} fixCount={session.summary.fixCount}
          classificationPendingCount={session.summary.classificationPendingCount} onNavigate={setStep} />}
        {session.error && <div className="alert error" role="alert">{session.error}</div>}
        {session.notice && <div className="alert success" role="status">{session.notice}</div>}
        <div className={hasFiles ? 'content-grid' : undefined}><div className="main-column">
          {step === 'setup' && (
            <section className="panel surface-card">
              <form className="setup-workspace" onSubmit={(event) => {
                event.preventDefault();
                const name = setupName.trim();
                if (!name) { setSetupError('Give your preparation set a name.'); return; }
                session.setProjectName(name);
                setStep(renameReturnStep.current);
              }}>
                <label className="field-label" htmlFor="workspace-name">Preparation set name</label>
                <input id="workspace-name" maxLength={100} value={setupName} disabled={session.busy} onChange={(event) => setSetupName(event.target.value)} />
                {setupError && <p role="alert" className="error-text">{setupError}</p>}
                <div className="action-row">
                  <button type="submit" className="button primary" disabled={session.busy}>Save name</button>
                  <button type="button" className="button secondary" onClick={() => setStep(renameReturnStep.current)}>Cancel</button>
                </div>
              </form>
            </section>
          )}
          {step === 'files' && <FilesPanel key={workspaceVersion}
            items={session.items} summary={session.summary} busy={session.busy} exporting={session.exporting}
            highlightedId={highlightedId} removedName={session.removedName} replacingId={session.replacingId}
            onLoadSample={() => { heading.current?.focus(); void session.loadDemo(); }}
            onAdd={(files) => { void session.addFiles(files); }} onReplace={(id, file) => { void session.replaceFile(id, file); }}
            onRename={session.rename} onClassify={session.classify} onOmitReference={session.omitReference}
            onRemove={(id) => { setPreview(null); session.remove(id); }}
            onUndoRemove={() => { void session.undoRemove(); }} onCancelReplacement={session.cancelReplacement}
            onPreview={(id) => setPreview({ id, page: 1 })} onCorrectDemo={(id) => { void session.correctDemo(id); }}
            onContinue={() => { setFindingFilter('all'); setStep('findings'); }}
          />}
          {step === 'findings' && <FindingsPanel key={findingFilter} items={session.items} summary={session.summary} onPreview={(id, page) => setPreview({ id, page })} onEditFile={editFile} onContinue={() => setStep('handoff')} initialFilter={findingFilter} />}
          {step === 'handoff' && <HandoffPanel items={session.items} summary={session.summary} busy={session.busy} exporting={session.exporting}
            onExport={() => { void session.exportPackage(); }} onBack={() => { setFindingFilter('all'); setStep('findings'); }}
            onFiles={() => setStep('files')} onPreview={(id, page) => setPreview({ id, page })} />}
          {canReset && <div className="workspace-reset">{clearConfirm ? <div className="notice reset-confirm"><strong>Clear this workspace and start again?</strong><p>All files and findings in this session will be removed. Originals and downloads stay unchanged.</p><div className="action-row reset-actions"><button className="button secondary danger-outline" disabled={session.exporting} onClick={reset}>Clear and start again</button><button className="button primary" onClick={() => setClearConfirm(false)}>Keep working</button></div></div> : <button className="button ghost sm" disabled={session.exporting} onClick={() => setClearConfirm(true)}>Start a new preparation set</button>}</div>}
        </div>{hasFiles && <PreparationSummary summary={session.summary} fileCount={session.items.length} working={session.working} onCoverage={() => { setFindingFilter('not-assessed'); setStep('findings'); }} />}</div>
      <footer className="footer"><span><a href="https://entheosit.com/" target="_blank" rel="noreferrer">EntheosIT</a> Preflight, local browser preparation</span><span>© 2026 Entheos Inc. Not affiliated with Honolulu DPP or Clariti.</span></footer>
    </main>
    {help && <HelpDialog onClose={() => setHelp(false)} />}
    {selected && preview && <PdfPreview key={`${selected.record.id}-${selected.record.revision}`} record={selected.record} file={selected.file} initialPage={preview.page} onClose={() => setPreview(null)} />}
  </>;
}
