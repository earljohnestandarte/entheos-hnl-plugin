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
    if (!acknowledged) { setValidation('Confirm the test-only and session-only limits to continue.'); return; }
    submitting.current = true;
    try { await onStart({ name: name.trim(), path }); }
    finally { submitting.current = false; }
  }

  return <section className="onboarding-layout" aria-label="Get started">
    <header className="setup-heading">
      <p className="section-label">PDF prescreen / New session</p>
      <h1>New preparation set</h1>
      <p>Check your PDF exports before opening CivCheck. Review file issues, replace corrected sheets, and download an organized set.</p>
    </header>

    <div className="onboarding-card">
      <div className="setup-progress" aria-label={`Getting started, step ${step + 1} of 3`}>
        {['Overview', 'Starting point', 'Your workspace'].map((label, index) => <span key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}><span className="progress-number">{index + 1}.</span>{label}</span>)}
      </div>
      <div className="onboarding-body">
        <h2 tabIndex={-1} ref={heading}>{['What this check covers', 'Choose a starting point', 'Name your set'][step]}</h2>
        {step === 0 && <>
          <p className="muted">A focused preparation check—not a second CivCheck application.</p>
          <div className="coverage-columns"><div><h3>We can check</h3><ul className="check-list"><li>Names and duplicate filenames</li><li>Sheet size, orientation, and page count</li><li>Whether a text layer is available</li></ul></div><div><h3>You still review</h3><ul className="plain-list"><li>Required documents and values</li><li>Stamp space and signatures</li><li>Design and code compliance</li></ul></div></div>
          <div className="notice"><strong>Test-only prototype</strong><p>Use synthetic or non-sensitive test PDFs—not real client plans. Current submission rules have not been independently verified.</p></div>
        </>}
        {step === 1 && <>
          <p className="muted">Try a short guided example, or prepare a set of your own test PDFs.</p>
          <fieldset className="path-options"><legend className="visually-hidden">Starting point</legend>
            <label className={`path-option ${path === 'sample' ? 'is-selected' : ''}`}><input type="radio" name="start-path" value="sample" checked={path === 'sample'} onChange={() => setPath('sample')} /><span><span className="option-title">Try the guided sample</span><span className="option-detail">Three synthetic PDFs, two issues to fix, and a clear correction path. No files needed.</span></span></label>
            <label className={`path-option ${path === 'test' ? 'is-selected' : ''}`}><input type="radio" name="start-path" value="test" checked={path === 'test'} onChange={() => setPath('test')} /><span><span className="option-title">Use my test PDFs</span><span className="option-detail">Add non-sensitive test exports. Confirm which files are plans and which are supporting documents.</span></span></label>
          </fieldset>
        </>}
        {step === 2 && <form id="setup-form" onSubmit={(event) => { event.preventDefault(); void start(); }}>
          <label className="field-label" htmlFor="set-name">Preparation set name</label>
          <input id="set-name" maxLength={100} value={name} disabled={busy} onChange={(event) => { setName(event.target.value); setValidation(''); }} aria-describedby="name-hint" />
          <p className="field-hint" id="name-hint">A label for this session—not a project submitted to CivCheck.</p>
          <div className="setup-selection"><span>Starting with</span><strong>{path === 'sample' ? 'Guided synthetic sample' : 'Your test PDFs'}</strong></div>
          <div className="notice"><strong>Your files stay in this tab.</strong><p>No upload, account, or autosave. Refreshing or closing the tab clears your workspace. Downloads are unencrypted copies.</p></div>
          <label className="acknowledgment"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={(event) => { setAcknowledged(event.target.checked); setValidation(''); }} /><span>I’ll use test data only and understand that this workspace is lost on refresh.</span></label>
        </form>}
        {(validation || error) && <p className="error-text" role="alert">{validation || error}</p>}
      </div>
      <div className="onboarding-footer"><span className="muted small">{step === 0 ? 'No account needed for this demo.' : 'Your setup stays here while you go back.'}</span><div className="action-row">{step > 0 && <button className="button secondary" disabled={busy} onClick={() => navigate(step - 1)}>Back</button>}{step < 2 ? <button key={`next-${step}`} type="button" className="button primary" onClick={() => navigate(step + 1)}>{step === 0 ? 'Get started' : 'Continue'} <span aria-hidden="true">→</span></button> : <button key="start" className="button primary" type="submit" form="setup-form" disabled={busy}>{busy ? 'Preparing sample…' : path === 'sample' ? 'Start guided sample' : 'Open workspace'} <span aria-hidden="true">→</span></button>}</div></div>
    </div>
  </section>;
}
