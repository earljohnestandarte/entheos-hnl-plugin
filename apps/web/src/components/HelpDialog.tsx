import { useEffect, useRef } from 'react';
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="help-dialog" aria-labelledby="help-title" onCancel={onClose}>
    <div className="dialog-top"><div><h2 id="help-title">Using Preflight</h2></div><button className="icon-button" aria-label="Close help" onClick={onClose}>×</button></div>
    <p className="muted">Familiar steps, without duplicating the official review. Opening this guide does not change your files.</p>
    <ol className="journey-list"><li><strong>Set up a local preparation set</strong><p>Choose the synthetic sample or non-sensitive test PDFs. No account or official application is created.</p></li><li><strong>Add and classify your PDFs</strong><p>Plans are drawing sheets; supporting documents can be multi-page forms. Review our filename-based suggestions.</p></li><li><strong>Fix, replace, and review</strong><p>Accept a safe name, correct the source document, and replace its PDF. Check manual and unassessed items too.</p></li><li><strong>Prepare for CivCheck</strong><p>Download your package. Upload candidates and applicant-only references are separate. CivCheck still performs its own checks.</p></li></ol>
    <div className="notice"><strong>Not saved. Not an approval.</strong><p>Refresh clears this session. Test data only. Stamp space, signatures, required evidence, scope, and code compliance are not validated.</p></div>
    <div className="action-row end"><button className="button primary" onClick={onClose}>Back to my workspace</button></div>
  </dialog>;
}
