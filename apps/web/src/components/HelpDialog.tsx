import { useEffect, useRef } from 'react';

const HELP_STEPS = [
  {
    title: 'Set up a local preparation set',
    detail: 'Add your own permit PDFs or folder, or try the synthetic sample. No account or official application is created.',
  },
  {
    title: 'Add and classify your PDFs',
    detail: 'Plans are drawing sheets; supporting documents can be multi-page forms or checklists. Review filename and content suggestions.',
  },
  {
    title: 'Fix, replace, and review',
    detail: 'Accept a safe name, correct the source document, and replace its PDF. Check extracted values, manual reviews, and unassessed items.',
  },
  {
    title: 'Prepare for CivCheck',
    detail: 'Download your package. Upload candidates and applicant-only references are separate. CivCheck still performs its own checks.',
  },
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} className="help-dialog" aria-labelledby="help-title" onCancel={onClose}>
      <div className="dialog-top">
        <div>
          <h2 id="help-title">Using Preflight</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close help" onClick={onClose}>×</button>
      </div>
      <p className="muted">Prepared by EntheosIT for Honolulu permit PDF checks without duplicating official review. Opening this guide does not change your files.</p>
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
        <strong>Not saved. Not an approval.</strong>
        <p>Refresh clears this session. Files stay in your browser. Stamp space, signatures, required evidence, scope, and code compliance are not validated.</p>
      </div>
      <div className="action-row end">
        <button type="button" className="button primary" onClick={onClose}>Back to my workspace</button>
      </div>
    </dialog>
  );
}
