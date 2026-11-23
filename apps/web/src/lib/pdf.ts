import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LIMITS, type PageInfo } from '@hnl/contracts';
import { withDeadline } from './deadline';

GlobalWorkerOptions.workerSrc = workerUrl;

export class UnsupportedPdfError extends Error {}

export async function readPdf(file: File, signal: AbortSignal): Promise<{ pages: PageInfo[]; hash: string }> {
  if (file.size > LIMITS.maxFileBytes) throw new UnsupportedPdfError('This prototype supports PDFs up to 25 MB.');
  let task: PDFDocumentLoadingTask | undefined;
  const cleanup = () => { if (task) { void task.destroy().catch(() => undefined); task = undefined; } };
  try {
    return await withDeadline(signal, LIMITS.timeoutMs, async (activeSignal) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
      const header = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
      if (!header.includes('%PDF-')) throw new UnsupportedPdfError('This file does not have a PDF signature. Export a PDF from the source application.');
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
      task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true, stopAtErrors: true });
      const document = await task.promise;
      if (document.numPages > LIMITS.maxPagesPerFile) throw new UnsupportedPdfError('This prototype supports up to 50 pages per PDF. Split the supporting document for testing.');
      const pages: PageInfo[] = [];
      for (let number = 1; number <= document.numPages; number++) {
        if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
        const page = await document.getPage(number);
        const viewport = page.getViewport({ scale: 1 });
        const reader = page.streamTextContent().getReader();
        let text = '';
        try {
          while (true) {
            if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
            const chunk = await reader.read();
            if (chunk.done) break;
            for (const item of chunk.value.items) {
              if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ');
              if (text.length > LIMITS.maxTextCharsPerPage) throw new UnsupportedPdfError('This page exceeds the prototype text limit. It has not been fully assessed.');
            }
          }
        } finally { void reader.cancel().catch(() => undefined); }
        pages.push({ page: number, widthInches: viewport.width / 72, heightInches: viewport.height / 72, rotation: page.rotate, text });
        page.cleanup();
      }
      if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
      return { pages, hash };
    }, cleanup);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') throw new UnsupportedPdfError('Analysis exceeded 30 seconds. This file has not been assessed.');
    if (error instanceof Error && error.name === 'PasswordException') throw new UnsupportedPdfError('Password-protected PDFs are not supported. Use an authorized unencrypted copy.');
    throw error;
  }
}

export async function renderPdfPage(file: File, pageNumber: number, canvas: HTMLCanvasElement, signal: AbortSignal): Promise<void> {
  let task: PDFDocumentLoadingTask | undefined;
  const cleanup = () => { if (task) { void task.destroy().catch(() => undefined); task = undefined; } };
  return withDeadline(signal, LIMITS.timeoutMs, async (activeSignal) => {
    const data = new Uint8Array(await file.arrayBuffer());
    if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
    task = getDocument({ data, isEvalSupported: false, useSystemFonts: true });
    const document = await task.promise;
    const page = await document.getPage(pageNumber);
    if (activeSignal.aborted) throw new DOMException('Canceled', 'AbortError');
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1100 / base.width, 1100 / base.height, 2) });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF preview is unavailable.');
    await page.render({ canvas, canvasContext: context, viewport }).promise;
  }, cleanup);
}
