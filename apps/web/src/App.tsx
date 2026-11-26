import { useEffect, useRef, useState } from 'react';
import type { FindingCategory } from '@hnl/contracts';
import { usePreparationSession } from './hooks/usePreparationSession';
import { StepNavigation, type WorkspaceStep } from './components/StepNavigation';
import { PreparationSummary } from './components/PreparationSummary';
import { FilesPanel } from './components/FilesPanel';
import { FindingsPanel } from './components/FindingsPanel';
import { HandoffPanel } from './components/HandoffPanel';
import { HelpDialog } from './components/HelpDialog';
import { PdfPreview } from './components/PdfPreview';

const stepCopy: Record<WorkspaceStep, { title: string; detail?: string }> = {
  setup: { title: 'Workspace setup' },
  files: { title: 'Files', detail: 'Check exported drawing sheets and supporting documents before CivCheck.' },
  findings: { title: 'Findings', detail: 'File issues first. Manual checks remain separate.' },
  handoff: { title: 'CivCheck handoff', detail: 'Practice file order, document assignments, and evidence review.' },
};

export default function App() {
  const session = usePreparationSession();
  const [step, setStep] = useState<WorkspaceStep>('setup');
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [help, setHelp] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [preview, setPreview] = useState<{ id: string; page: number } | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<FindingCategory | 'all'>('all');
  const [setupName, setSetupName] = useState('');
  const [setupError, setSetupError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const setupInputRef = useRef<HTMLInputElement>(null);
  const previousView = useRef({ step, workspaceVersion });
  const renameReturnStep = useRef<WorkspaceStep>('files');
  const selected = session.items.find((item) => item.record.id === preview?.id);
  const hasFiles = session.items.length > 0;
  const errorFileCount = session.items.filter(({ record }) => record.status === 'error' || record.status === 'unsupported').length;
  const verifiedSet = new Set(session.verifiedFindingIds);
  const verifiedReviewCount = session.summary.findings.filter((finding) => finding.category === 'review' && verifiedSet.has(finding.id)).length;
  const pageDetail = step === 'setup'
    ? (hasWorkspace
      ? 'Update the name shown on your workspace, checklist, and exported ZIP manifest.'
      : 'Name this preparation set before adding synthetic or approved test PDFs.')
    : stepCopy[step].detail;

  useEffect(() => {
    if (previousView.current.step === step && previousView.current.workspaceVersion === workspaceVersion) return;
    previousView.current = { step, workspaceVersion };
    heading.current?.focus();
  }, [step, workspaceVersion]);

  function navigate(next: WorkspaceStep) {
    setClearConfirm(false);
    if (next !== 'files') setHighlightedId(null);
    if (next === 'setup' && step !== 'setup') {
      renameReturnStep.current = step;
      setSetupName(session.projectName);
      setSetupError('');
    }
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
    setWorkspaceVersion((version) => version + 1);
    setStep('setup');
    setHasWorkspace(false);
    setSetupName('');
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
            {hasWorkspace && <p className="page-context">{session.projectName}</p>}
            <h1 ref={heading} tabIndex={-1}>{stepCopy[step].title}</h1>
            {pageDetail && <p>{pageDetail}</p>}
          </div>
        </div>
        <StepNavigation current={step} hasWorkspace={hasWorkspace} hasFiles={hasFiles} fixCount={session.summary.fixCount}
          classificationPendingCount={session.summary.classificationPendingCount} onNavigate={navigate} />
        {session.error && <div className="alert error" role="alert">{session.error}</div>}
        {session.notice && <div className="alert success" role="status">{session.notice}</div>}
        <div className={hasFiles ? 'content-grid' : undefined}><div className="main-column">
          {step === 'setup' && (
            <div className={!hasFiles ? 'setup-layout' : undefined}>
              <section className="panel surface-card setup-workspace">
                <div className="panel-heading">
                  <div>
                    <h2>{hasWorkspace ? 'Rename preparation set' : 'Start a preparation set'}</h2>
                  </div>
                  <span className="panel-meta">
                    {hasWorkspace
                      ? `${session.items.length} ${session.items.length === 1 ? 'file' : 'files'}`
                      : 'Local browser session'}
                  </span>
                </div>
                <form noValidate onSubmit={(event) => {
                  event.preventDefault();
                  const name = setupName.trim();
                  if (session.busy) return;
                  if (!name) {
                    setSetupError('Enter a project name.');
                    setupInputRef.current?.focus();
                    return;
                  }
                  if (!hasWorkspace) session.clearFeedback();
                  session.setProjectName(name);
                  setSetupName(name);
                  setSetupError('');
                  setStep(hasWorkspace ? renameReturnStep.current : 'files');
                  setHasWorkspace(true);
                }}>
                  <div className="field-header">
                    <label className="field-label" htmlFor="workspace-name">Project name</label>
                    {setupName.length >= 75 && (
                      <span className="field-count" aria-hidden="true">{setupName.length}/100</span>
                    )}
                  </div>
                  <input
                    id="workspace-name"
                    ref={setupInputRef}
                    required
                    maxLength={100}
                    autoComplete="off"
                    placeholder="e.g., 1420 Ala Moana Blvd — Permit Set"
                    value={setupName}
                    disabled={session.busy}
                    aria-invalid={!!setupError}
                    aria-describedby={setupError ? 'workspace-name-error workspace-name-hint' : 'workspace-name-hint'}
                    onChange={(event) => { setSetupName(event.target.value); setSetupError(''); }}
                  />
                  {setupError && <p id="workspace-name-error" role="alert" className="error-text">{setupError}</p>}
                  <p id="workspace-name-hint" className="field-hint">
                    Used as the workspace title and recorded in the CivCheck handoff checklist and ZIP manifest.
                  </p>
                  {session.busy && (
                    <p className="field-hint">Analyzing files in the background — name editing unlocks once complete.</p>
                  )}
                  <div className="action-row setup-actions">
                    <button type="submit" className="button primary" disabled={session.busy}>
                      {hasWorkspace ? 'Save name' : 'Continue to files'}
                    </button>
                    {hasWorkspace && (
                      <button type="button" className="button secondary" onClick={() => {
                        setSetupError('');
                        setStep(renameReturnStep.current);
                      }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>
              {!hasFiles && (
                <aside className="setup-aside" aria-label="Preparation scope and privacy">
                  <section className="coverage-card setup-guide-card">
                    <h2>What happens next</h2>
                    <ol className="setup-roadmap">
                      <li>
                        <span className="setup-roadmap-num" aria-hidden="true">1</span>
                        <div>
                          <strong>Add &amp; classify PDFs</strong>
                          <p>Drop drawing sheets and supporting forms, or try the guided sample.</p>
                        </div>
                      </li>
                      <li>
                        <span className="setup-roadmap-num" aria-hidden="true">2</span>
                        <div>
                          <strong>Review findings &amp; values</strong>
                          <p>Catch filename, sheet-size, orientation, and index mismatches early.</p>
                        </div>
                      </li>
                      <li>
                        <span className="setup-roadmap-num" aria-hidden="true">3</span>
                        <div>
                          <strong>Export practice ZIP</strong>
                          <p>Download organized upload and reference folders with a portable checklist.</p>
                        </div>
                      </li>
                    </ol>
                  </section>
                  <section className="session-card setup-boundary-card">
                    <h3>Local browser boundary</h3>
                    <p>PDFs stay in memory in this browser tab and clear on refresh. Use synthetic or approved de-identified test PDFs only.</p>
                    <button type="button" className="button ghost sm" onClick={() => setHelp(true)}>
                      Review check coverage
                    </button>
                  </section>
                </aside>
              )}
            </div>
          )}
          {step === 'files' && <FilesPanel key={workspaceVersion}
            items={session.items} summary={session.summary} busy={session.busy} exporting={session.exporting}
            highlightedId={highlightedId} removedName={session.removedName} replacingId={session.replacingId}
            verifiedFileKeys={session.verifiedFileKeys} onVerifyFile={session.verifyFile}
            resolvedFixes={session.resolvedFixes}
            onLoadSample={() => { heading.current?.focus(); void session.loadDemo(); }}
            onAdd={(files) => { void session.addFiles(files); }} onReplace={(id, file) => { void session.replaceFile(id, file); }}
            onRename={session.rename} onClassify={session.classify} onOmitReference={session.omitReference}
            onRemove={(id) => { setPreview(null); session.remove(id); }}
            onUndoRemove={() => { void session.undoRemove(); }} onCancelReplacement={session.cancelReplacement}
            onPreview={(id) => setPreview({ id, page: 1 })} onCorrectDemo={(id) => { void session.correctDemo(id); }}
            onContinue={() => { setFindingFilter('all'); setStep('findings'); }}
          />}
          {step === 'findings' && <FindingsPanel key={findingFilter} items={session.items} summary={session.summary}
            busy={session.busy} verifiedIds={session.verifiedFindingIds}
            resolvedFixes={session.resolvedFixes}
            onToggleVerified={session.toggleFindingVerified} onSetVerified={session.setFindingsVerified}
            onRename={session.rename} onReplace={(id, file) => { void session.replaceFile(id, file); }}
            onClassify={session.classify}
            onPreview={(id, page) => setPreview({ id, page })} onEditFile={editFile}
            onContinue={() => setStep('handoff')} initialFilter={findingFilter} />}
          {step === 'handoff' && <HandoffPanel items={session.items} summary={session.summary} verifiedIds={session.verifiedFindingIds} resolvedFixCount={session.resolvedFixes.length} busy={session.busy} exporting={session.exporting}
            onExport={() => { void session.exportPackage(); }} onBack={() => { setFindingFilter('all'); setStep('findings'); }}
            onFiles={() => setStep('files')} onPreview={(id, page) => setPreview({ id, page })} />}
          {hasWorkspace && <div className="workspace-reset">{clearConfirm ? <div className="notice reset-confirm"><strong>Clear this workspace and start again?</strong><p>All files and findings in this session will be removed. Originals and downloads stay unchanged.</p><div className="action-row reset-actions"><button className="button secondary danger-outline" disabled={session.exporting} onClick={reset}>Clear and start again</button><button className="button primary" onClick={() => setClearConfirm(false)}>Keep working</button></div></div> : <button className="button ghost sm" disabled={session.exporting} onClick={() => setClearConfirm(true)}>Start a new preparation set</button>}</div>}
        </div>{hasFiles && <PreparationSummary summary={session.summary} fileCount={session.items.length} working={session.working} errorFileCount={errorFileCount} verifiedReviewCount={verifiedReviewCount} resolvedFixCount={session.resolvedFixes.length} onCoverage={() => { setFindingFilter('not-assessed'); setStep('findings'); }} />}</div>
      <footer className="footer"><span><a href="https://entheosit.com/" target="_blank" rel="noreferrer">EntheosIT</a> Preflight, local browser preparation</span><span>© 2026 Entheos Inc. Not affiliated with Honolulu DPP or Clariti.</span></footer>
    </main>
    {help && <HelpDialog onClose={() => setHelp(false)} />}
    {selected && preview && <PdfPreview key={`${selected.record.id}-${selected.record.revision}`} record={selected.record} file={selected.file} initialPage={preview.page} onClose={() => setPreview(null)} />}
  </>;
}
