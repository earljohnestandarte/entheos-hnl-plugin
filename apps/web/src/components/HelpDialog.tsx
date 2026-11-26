import { useEffect, useRef } from 'react';

const HELP_STEPS = [
  {
    title: 'Add and classify your PDFs',
    detail: 'Add synthetic or approved test PDFs, or try the guided sample. Confirm drawing sheets as plans, forms as supporting documents, and checklists used for review as references.',
  },
  {
    title: 'Fix, replace, and review',
    detail: 'Accept a safe name, correct the source document, and replace its PDF. Check extracted values, manual reviews, and unassessed items.',
  },
  {
    title: 'Prepare for CivCheck',
    detail: 'Use the on-screen checklist to rehearse the handoff. Download the package for local practice and keep the test files out of CivCheck.',
  },
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  function close() {
    dialog.current?.close?.();
    onClose();
  }
  return (
    <dialog ref={dialog} className="help-dialog" aria-labelledby="help-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      <div className="dialog-top">
        <div>
          <h2 id="help-title">Using Preflight</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close help" onClick={close}>×</button>
      </div>
      <div className="coverage-columns">
        <div className="coverage-box is-covered">
          <h3>Checked locally</h3>
          <ul className="check-list">
            <li>Filenames, duplicates, and title sheet</li>
            <li>Plan sheet count, size, and orientation</li>
            <li>Drawing-index matches and text-layer availability</li>
          </ul>
        </div>
        <div className="coverage-box">
          <h3>Reviewed by you</h3>
          <ul className="check-list">
            <li>Suggested title-block values and document pages</li>
            <li>Required evidence, stamp space, and signatures</li>
            <li>Project scope and code compliance</li>
          </ul>
        </div>
      </div>
      <ol className="help-steps">
        {HELP_STEPS.map((item, index) => (
          <li key={item.title}>
            <span className="help-step-num" aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="notice">
        <strong>Local test session</strong>
        <p>Files stay in your browser. Refresh clears this session.</p>
      </div>
      <div className="action-row end">
        <button type="button" className="button primary" onClick={close}>Close guide</button>
      </div>
    </dialog>
  );
}
