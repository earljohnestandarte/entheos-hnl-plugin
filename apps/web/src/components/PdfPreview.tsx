import { useEffect, useRef, useState } from 'react';
import type { DocumentRecord } from '@hnl/contracts';
import { renderPdfPage } from '../lib/pdf';

export function PdfPreview({ record, file, initialPage, onClose }: { record: DocumentRecord; file: File; initialPage: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(initialPage);
  const [message, setMessage] = useState('Rendering preview…');
  const [renderedPage, setRenderedPage] = useState<number | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setMessage('Rendering preview…');
    setRenderedPage(null);
    if (canvas.current) void renderPdfPage(file, page, canvas.current, controller.signal)
      .then(() => { if (!controller.signal.aborted) { setMessage(''); setRenderedPage(page); } })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMessage(`Preview could not be rendered (${error instanceof Error ? error.name : 'unknown error'}). The source PDF is unchanged.`); });
    return () => controller.abort();
  }, [file, page]);
  return <dialog ref={dialog} onCancel={onClose} className="preview-dialog" aria-labelledby="preview-title">
    <div className="dialog-top"><div><span className="eyebrow">SOURCE DOCUMENT · REVISION {record.revision}</span><h2 id="preview-title">{record.exportName}</h2></div><button onClick={onClose} aria-label="Close PDF preview" className="icon-button">×</button></div>
    <div className="preview-tools"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous page</button><span>Page {page} of {record.pages.length}</span><button disabled={page === record.pages.length} onClick={() => setPage(page + 1)}>Next page</button></div>
    <div role="status">{message}</div><div className="canvas-wrap"><canvas key={page} hidden={renderedPage !== page} ref={canvas} aria-label={`PDF page ${page} preview. Extracted text is available below.`} /></div>
    <details><summary>Extracted text · page {page}</summary><pre className="extracted-text">{record.pages[page - 1]?.text.trim() || 'No readable text layer was detected. Review the source visually; this does not prove content is missing.'}</pre></details>
    <p className="muted">Visual reference only. Stamp clearance, signatures, and design compliance are not validated.</p>
  </dialog>;
}
