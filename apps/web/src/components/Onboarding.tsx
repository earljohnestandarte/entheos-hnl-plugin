import { useRef, useState } from 'react';

export type StartPath = 'sample' | 'test';
export interface SetupChoice { name: string; path: StartPath }

export function Onboarding({ initialName, busy, error, onStart }: {
  initialName: string;
  busy: boolean;
  error: string;
  onStart: (choice: SetupChoice) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [acknowledged, setAcknowledged] = useState(false);
  const [validation, setValidation] = useState('');
  const submitting = useRef(false);
  const confirmation = useRef<HTMLInputElement>(null);

  async function start(path: StartPath) {
    if (submitting.current || busy) return;
    if (!acknowledged) {
      setValidation('Confirm the test-only session before you start.');
      confirmation.current?.focus();
      return;
    }
    submitting.current = true;
    try { await onStart({ name: name.trim() || 'My preparation set', path }); }
    finally { submitting.current = false; }
  }

  return (
    <section className="onboarding-layout" aria-labelledby="start-title">
      <div className="onboarding-card">
        <header className="setup-heading">
          <h1 id="start-title">New preparation set</h1>
          <p>Check PDF filenames and drawing sheets, then rehearse the Honolulu CivCheck handoff.</p>
        </header>

        <label className="field-label" htmlFor="set-name">Preparation set name <span className="muted">(optional)</span></label>
        <input id="set-name" maxLength={100} autoComplete="off" value={name} disabled={busy}
          onChange={(event) => setName(event.target.value)} />

        <div className="notice">
          <strong>Local test session</strong>
          <p>Use fictional or approved, de-identified project data. Files stay in this tab, and refreshing clears the set. Downloads are unencrypted.</p>
          <label className="acknowledgment">
            <input ref={confirmation} type="checkbox" checked={acknowledged} disabled={busy}
              aria-describedby={validation ? 'start-error' : undefined}
              onChange={(event) => { setAcknowledged(event.target.checked); setValidation(''); }} />
            <span>I’ll use test files and keep them out of CivCheck.</span>
          </label>
          {validation && <p className="error-text" id="start-error" role="alert">{validation}</p>}
        </div>

        <div className="start-actions">
          <div>
            <button type="button" className="button primary" disabled={busy} onClick={() => { void start('test'); }}>
              Upload a test plan set
            </button>
            <p className="field-hint">Use individual PDFs or a folder exported from your normal CAD workflow.</p>
          </div>
          <div>
            <button type="button" className="button secondary" disabled={busy} onClick={() => { void start('sample'); }}>
              {busy ? 'Preparing sample…' : 'Try the guided sample'}
            </button>
            <p className="field-hint">Explore three sample PDFs and fix two deliberate issues.</p>
          </div>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </section>
  );
}
