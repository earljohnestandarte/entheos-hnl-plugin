import { useEffect, useRef, useState } from 'react';
import { DEMO_RULE_PACK, type DocumentRecord } from '@hnl/contracts';
import { renderPdfPage } from '../lib/pdf';

export function PdfPreview({ record, file, initialPage, onClose }: { record: DocumentRecord; file: File; initialPage: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(initialPage);
  const [message, setMessage] = useState('Rendering preview…');
  const [renderedPage, setRenderedPage] = useState<number | null>(null);
  const [showStampZone, setShowStampZone] = useState(record.kind === 'plan');
  const [textOpen, setTextOpen] = useState(false);
  const pageInfo = record.pages[page - 1];
  const isPlanSheet = record.kind === 'plan'
    && Boolean(pageInfo)
    && pageInfo.widthInches >= DEMO_RULE_PACK.minWidthInches
    && pageInfo.heightInches >= DEMO_RULE_PACK.minHeightInches;
  const stampWidthPct = pageInfo ? Math.min(100, (5.75 / pageInfo.widthInches) * 100) : 0;
  const stampHeightPct = pageInfo ? Math.min(100, (3.75 / pageInfo.heightInches) * 100) : 0;

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

  function close() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }} className="preview-dialog" aria-labelledby="preview-title">
      <div className="dialog-top">
        <div>
          <h2 id="preview-title">{record.exportName}</h2>
          <p className="muted small">Source document, revision {record.revision}</p>
        </div>
        <button type="button" onClick={close} aria-label="Close PDF preview" className="icon-button">×</button>
      </div>
      <div className="preview-tools">
        <div className="preview-pager">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous page</button>
          <span>Page {page} of {record.pages.length}{pageInfo ? `, ${pageInfo.widthInches.toFixed(1)} × ${pageInfo.heightInches.toFixed(1)} in` : ''}</span>
          <button type="button" disabled={page === record.pages.length} onClick={() => setPage(page + 1)}>Next page</button>
        </div>
        {isPlanSheet && (
          <label className="stamp-toggle">
            <input type="checkbox" checked={showStampZone} onChange={(event) => setShowStampZone(event.target.checked)} />
            <span>5.75 × 3.75 in stamp zone</span>
          </label>
        )}
      </div>
      <div className="preview-scroll">
        {message && <div className="preview-status" role="status">{message}</div>}
        <div className="canvas-wrap">
          <div className={`canvas-stage ${renderedPage === page ? 'is-ready' : ''}`}>
            <canvas key={page} hidden={renderedPage !== page} ref={canvas} aria-label={`PDF page ${page} preview. Extracted text is available below.`} />
            {isPlanSheet && showStampZone && renderedPage === page && (
              <div
                className="stamp-overlay"
                style={{ width: `${stampWidthPct}%`, height: `${stampHeightPct}%` }}
                aria-hidden="true"
              >
                <span>DPP stamp zone 5.75 × 3.75 in</span>
              </div>
            )}
          </div>
        </div>
        <div className="smooth-details">
          <button type="button" className="expander-trigger" aria-expanded={textOpen} onClick={() => setTextOpen((prev) => !prev)}>
            <span className={`expander-caret ${textOpen ? 'is-open' : ''}`} aria-hidden="true">▸</span>
            <span>Extracted text, page {page}</span>
          </button>
          <div className="expander" data-open={textOpen || undefined}>
            <div className="expander-inner" inert={!textOpen ? true : undefined}>
              <pre className="extracted-text">{pageInfo?.text.trim() || 'No readable text layer was detected. Review the source visually; this does not prove content is missing.'}</pre>
            </div>
          </div>
        </div>
      </div>
      <p className="muted preview-footnote">Visual reference only. Stamp clearance, signatures, and design compliance are not validated automatically.</p>
    </dialog>
  );
}
