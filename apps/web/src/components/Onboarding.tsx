import { useRef, useState } from 'react';

export type StartPath = 'sample' | 'test';
export interface SetupChoice { name: string; path: StartPath }

export function Onboarding({ initialName, initialPath = 'sample', busy, error, onStart }: {
  initialName: string;
  initialPath?: StartPath;
  busy: boolean;
  error: string;
  onStart: (choice: SetupChoice) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<StartPath>(initialPath);
  const [name, setName] = useState(initialName);
  const [acknowledged, setAcknowledged] = useState(false);
  const [validation, setValidation] = useState('');
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  function navigate(next: number) {
    setStep(next);
    setValidation('');
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function start() {
    if (submitting.current || busy) return;
    if (!name.trim()) { setValidation('Give your preparation set a name.'); return; }
    if (!acknowledged) { setValidation('Confirm the local session and non-approval notice to continue.'); return; }
    submitting.current = true;
    try { await onStart({ name: name.trim(), path }); }
    finally { submitting.current = false; }
  }

  return (
    <section className="onboarding-layout" aria-label="Get started">
      <div className="onboarding-card">
        <header className="setup-heading">
          <h1>New preparation set</h1>
          <p>Check exported Honolulu permit PDFs locally for sheet size, filenames, intake values, and package structure before CivCheck.</p>
        </header>

        <div className="setup-progress" aria-label={`Getting started, step ${step + 1} of 3`}>
          {['Overview', 'Starting point', 'Your workspace'].map((label, index) => (
            <span key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>
              <span className="progress-num" aria-hidden="true">{index + 1}.</span> {label}
            </span>
          ))}
        </div>

        <div className="onboarding-body">
          <h2 tabIndex={-1} ref={heading}>{['What this check covers', 'Choose a starting point', 'Name your set'][step]}</h2>

          {step === 0 && (
            <>
              <div className="coverage-columns">
                <div className="coverage-box is-covered">
                  <h3>Checked locally</h3>
                  <ul className="check-list">
                    <li>Filenames, duplicates, and title sheet</li>
                    <li>36 × 24 in landscape &amp; common sheet sizes</li>
                    <li>Extracted TMK, areas, zoning &amp; text cues</li>
                  </ul>
                </div>
                <div className="coverage-box">
                  <h3>Reviewed by you</h3>
                  <ul className="plain-list">
                    <li>Required document set completeness</li>
                    <li>5.75 × 3.75 in stamp zone &amp; signatures</li>
                    <li>Design and building code compliance</li>
                  </ul>
                </div>
              </div>
              <div className="notice">
                <strong>Local browser processing</strong>
                <p>PDFs stay in this tab and are never uploaded to a server. Always verify current submission rules in CivCheck.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="muted">Use synthetic or approved test PDFs, or walk through a short guided sample.</p>
              <fieldset className="path-options">
                <legend className="visually-hidden">Starting point</legend>
                <label className={`path-option ${path === 'sample' ? 'is-selected' : ''}`}>
                  <input type="radio" name="start-path" value="sample" checked={path === 'sample'} onChange={() => setPath('sample')} />
                  <span>
                    <span className="option-title">Try the guided sample</span>
                    <span className="option-detail">Three synthetic PDFs with two formatting issues and a guided correction path. No files needed.</span>
                  </span>
                </label>
                <label className={`path-option ${path === 'test' ? 'is-selected' : ''}`}>
                  <input type="radio" name="start-path" value="test" checked={path === 'test'} onChange={() => setPath('test')} />
                  <span>
                    <span className="option-title">Use my test PDFs</span>
                    <span className="option-detail">Choose individual test PDFs or a folder. Confirm which files are plans and which are supporting documents.</span>
                  </span>
                </label>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <form id="setup-form" onSubmit={(event) => { event.preventDefault(); void start(); }}>
              <label className="field-label" htmlFor="set-name">Preparation set name</label>
              <input
                id="set-name"
                maxLength={100}
                autoComplete="off"
                value={name}
                disabled={busy}
                onChange={(event) => { setName(event.target.value); setValidation(''); }}
                aria-describedby="name-hint"
              />
              <p className="field-hint" id="name-hint">Label for this local session, not an official CivCheck project name.</p>
              <div className="setup-selection">
                <span>Starting with</span>
                <strong>{path === 'sample' ? 'Guided synthetic sample' : 'Your test PDFs'}</strong>
              </div>
              <div className="notice">
                <strong>Your files stay in this tab</strong>
                <p>No upload, account, or autosave. Refreshing or closing the tab clears your workspace. Downloads are unencrypted copies.</p>
              </div>
              <label className="acknowledgment">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={busy}
                  onChange={(event) => { setAcknowledged(event.target.checked); setValidation(''); }}
                />
                <span>I’ll use synthetic or approved test files and keep them out of CivCheck. Refreshing clears this workspace.</span>
              </label>
            </form>
          )}
          {(validation || error) && <p className="error-text" role="alert">{validation || error}</p>}
        </div>

        <div className="onboarding-footer">
          <span className="muted small">{step === 0 ? 'No account needed' : 'Your choices stay intact if you go back'}</span>
          <div className="action-row">
            {step > 0 && <button type="button" className="button secondary" disabled={busy} onClick={() => navigate(step - 1)}>Back</button>}
            {step < 2 ? (
              <button key={`next-${step}`} type="button" className="button primary" onClick={() => navigate(step + 1)}>
                {step === 0 ? 'Get started' : 'Continue'}
              </button>
            ) : (
              <button key="start" className="button primary" type="submit" form="setup-form" disabled={busy}>
                {busy ? 'Preparing sample…' : path === 'sample' ? 'Start guided sample' : 'Open workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
