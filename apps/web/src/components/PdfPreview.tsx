import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_RULE_PACK, type DocumentRecord } from '@hnl/contracts';
import { renderPdfPage } from '../lib/pdf';

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (parts.length >= 400) break;
    parts.push(text.slice(offset, match.index), <mark key={match.index}>{match[0]}</mark>);
    offset = match.index + match[0].length;
  }
  return [...parts, text.slice(offset)];
}

export function PdfPreview({ record, file, initialPage, onClose }: { record: DocumentRecord; file: File; initialPage: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(initialPage);
  const [message, setMessage] = useState('Rendering preview…');
  const [rendered, setRendered] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const zoom = ZOOM_LEVELS[zoomLevel];
  const renderKey = `${page}-${zoom}`;
  const [showStampZone, setShowStampZone] = useState(record.kind === 'plan');
  const [textOpen, setTextOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchTerm = query.trim();
  const hasText = useMemo(() => record.pages.some(({ text }) => text.trim()), [record.pages]);
  const matches = useMemo(() => searchTerm
    ? record.pages.filter(({ text }) => text.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => item.page)
    : [], [record.pages, searchTerm]);
  const matchIndex = matches.indexOf(page);
  const pageInfo = record.pages[page - 1];
  const aspect = pageInfo ? pageInfo.widthInches / pageInfo.heightInches : 1;
  const stageWidth = `min(${zoom * 100}%, ${55 * aspect * zoom}vh, ${1100 * zoom}px)`;
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
    setRendered(null);
    if (canvas.current) void renderPdfPage(file, page, canvas.current, controller.signal, zoom)
      .then(() => { if (!controller.signal.aborted) { setMessage(''); setRendered(renderKey); } })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMessage(`Preview could not be rendered (${error instanceof Error ? error.name : 'unknown error'}). The source PDF is unchanged.`); });
    return () => controller.abort();
  }, [file, page, zoom, renderKey]);

  function jumpToMatch(direction: number) {
    if (matches.length === 0) return;
    const nearby = direction > 0 ? matches.find((item) => item >= page) : [...matches].reverse().find((item) => item <= page);
    const next = matchIndex < 0 || !textOpen ? nearby ?? matches[direction > 0 ? 0 : matches.length - 1]
      : matches[(matchIndex + direction + matches.length) % matches.length];
    setPage(next);
    setTextOpen(true);
  }

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
        <div className="preview-pager" role="group" aria-label="PDF zoom">
          <button type="button" onClick={() => setZoomLevel(0)} disabled={zoomLevel === 0}>Fit page</button>
          <button type="button" onClick={() => setZoomLevel(zoomLevel - 1)} disabled={zoomLevel === 0} aria-label="Zoom out">−</button>
          <span aria-live="polite">{zoomLevel === 0 ? 'Fit' : `${zoom * 100}%`}</span>
          <button type="button" onClick={() => setZoomLevel(zoomLevel + 1)} disabled={zoomLevel === ZOOM_LEVELS.length - 1} aria-label="Zoom in">+</button>
        </div>
        {isPlanSheet && (
          <label className="stamp-toggle">
            <input type="checkbox" checked={showStampZone} onChange={(event) => setShowStampZone(event.target.checked)} />
            <span>5.75 × 3.75 in stamp zone</span>
          </label>
        )}
      </div>
      <form className="preview-search" onSubmit={(event) => { event.preventDefault(); jumpToMatch(1); }}>
        <label className="field-label" htmlFor="preview-search">Find in extracted text</label>
        <div className="action-row">
          <input id="preview-search" type="search" value={query} maxLength={100} autoComplete="off"
            disabled={!hasText} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="button secondary sm" disabled={!matches.length} onClick={() => jumpToMatch(-1)}>Previous result</button>
          <button type="submit" className="button secondary sm" disabled={!matches.length}>Next result</button>
        </div>
        <p className="field-hint" role="status">{!hasText ? 'Review the drawing visually. This PDF has no searchable text layer.'
          : searchTerm ? matches.length
            ? `${matches.length} ${matches.length === 1 ? 'page matches' : 'pages match'}${matchIndex >= 0 ? ` · Result ${matchIndex + 1} of ${matches.length}` : ''}`
            : 'No matching pages' : 'Search this document’s text layer.'}</p>
      </form>
      <div className="preview-scroll">
        {message && <div className="preview-status" role="status">{message}</div>}
        <div className={`canvas-wrap ${zoomLevel > 0 ? 'is-zoomed' : ''}`}
          role={zoomLevel > 0 ? 'region' : undefined} aria-label={zoomLevel > 0 ? 'PDF drawing viewport' : undefined}
          tabIndex={zoomLevel > 0 ? 0 : undefined}>
          <div className={`canvas-stage ${rendered === renderKey ? 'is-ready' : ''}`} style={{ width: stageWidth }}>
            <canvas key={renderKey} hidden={rendered !== renderKey} ref={canvas} aria-label={`PDF page ${page} preview. Extracted text is available below.`} />
            {isPlanSheet && showStampZone && rendered === renderKey && (
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
              <pre className="extracted-text">{pageInfo?.text.trim() ? highlightText(pageInfo.text, searchTerm)
                : 'No readable text layer was detected. Review the source visually.'}</pre>
            </div>
          </div>
        </div>
      </div>
      <p className="muted preview-footnote">Visual reference only. Stamp clearance, signatures, and design compliance are not validated automatically.</p>
    </dialog>
  );
}
