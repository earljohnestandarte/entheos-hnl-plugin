// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS } from '@hnl/contracts';
import { readPdf, UnsupportedPdfError } from '../lib/pdf';
import { createCorrectedPlan, createDemoFiles } from '../lib/demo';
import { buildPackage, downloadBytes } from '../lib/export';
import { usePreparationSession } from './usePreparationSession';

vi.mock('../lib/pdf', () => ({ readPdf: vi.fn(), UnsupportedPdfError: class extends Error {} }));
vi.mock('../lib/demo', () => ({ createDemoFiles: vi.fn(), createCorrectedPlan: vi.fn() }));
vi.mock('../lib/export', () => ({ buildPackage: vi.fn(), downloadBytes: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

const parsed = () => ({
  hash: 'a'.repeat(64),
  pages: [{ page: 1, widthInches: 36, heightInches: 24, rotation: 0, text: 'Synthetic plan' }],
});
const pdf = (name = 'A101.pdf') => new File(['%PDF-synthetic'], name, { type: 'application/pdf' });
function sizedPdf(size: number): File {
  return Object.defineProperty(pdf(), 'size', { value: size });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readPdf).mockImplementation(async () => parsed());
  vi.mocked(createDemoFiles).mockResolvedValue([pdf()]);
  vi.mocked(createCorrectedPlan).mockResolvedValue(pdf('A101-corrected.pdf'));
  vi.mocked(buildPackage).mockResolvedValue(new Uint8Array([1, 2, 3]));
});
afterEach(cleanup);

describe('usePreparationSession', () => {
  it('adds sources, exposes analysis, and updates names and classifications without changing originals', async () => {
    const { result } = renderHook(() => usePreparationSession());
    const source = pdf();
    expect(result.current.projectName).toBe('My preparation set');
    await act(async () => { await result.current.addFiles([source, pdf('supporting-form.pdf')]); });
    const id = result.current.items[0].record.id;
    expect(result.current.items[0]).toMatchObject({ file: source, demo: false, record: { status: 'complete', revision: 1 } });
    expect(result.current.items[1].record.kind).toBe('supporting');
    expect(result.current.summary.completedCount).toBe(2);
    act(() => { result.current.rename(id, 'A102.pdf'); result.current.classify(id, 'supporting'); });
    expect(result.current.items[0].record).toMatchObject({ exportName: 'A102.pdf', originalName: 'A101.pdf', kind: 'supporting' });
    expect(result.current.busy).toBe(false);
  });

  it('synchronously locks repeated async actions while allowing removal during parsing', async () => {
    const pending = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => usePreparationSession());
    let adding!: Promise<void>;
    let duplicateDemo!: Promise<boolean>;
    act(() => {
      adding = result.current.addFiles([pdf(), pdf('A102.pdf')]);
      void result.current.addFiles([pdf('duplicate.pdf')]);
      duplicateDemo = result.current.loadDemo();
      void result.current.exportPackage();
    });
    expect(await duplicateDemo).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(result.current.working).toBe(true);
    const [first, second] = result.current.items;
    act(() => {
      result.current.rename(first.record.id, 'ignored.pdf');
      result.current.classify(first.record.id, 'supporting');
      result.current.remove(first.record.id);
      result.current.remove(second.record.id);
    });
    expect(vi.mocked(readPdf).mock.calls[0][1].aborted).toBe(true);
    await act(async () => { pending.resolve(parsed()); await adding; });
    expect(result.current.items).toEqual([]);
    expect(readPdf).toHaveBeenCalledTimes(1);
    expect(createDemoFiles).not.toHaveBeenCalled();
    expect(buildPackage).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('rejects oversized selections atomically using all three existing limits', async () => {
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { await result.current.addFiles(Array.from({ length: LIMITS.maxFiles + 1 }, () => pdf())); });
    expect(result.current.error).toContain('up to 20 files');
    await act(async () => { await result.current.addFiles([pdf(), sizedPdf(LIMITS.maxFileBytes + 1)]); });
    expect(result.current.error).toContain('25 MB or smaller');
    await act(async () => { await result.current.addFiles(Array.from({ length: 5 }, () => sizedPdf(LIMITS.maxFileBytes))); });
    expect(result.current.error).toContain('100 MB or smaller');
    expect(result.current.items).toEqual([]);
    expect(readPdf).not.toHaveBeenCalled();
  });

  it('preserves unsupported and parser failure results without silently omitting files', async () => {
    vi.mocked(readPdf)
      .mockRejectedValueOnce(new UnsupportedPdfError('Password-protected PDFs are not supported.'))
      .mockRejectedValueOnce(new Error('parse failure'));
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { await result.current.addFiles([pdf(), pdf('A102.pdf')]); });
    expect(result.current.items[0].record).toMatchObject({ status: 'unsupported', error: 'Password-protected PDFs are not supported.', pages: [] });
    expect(result.current.items[1].record).toMatchObject({ status: 'error', pages: [] });
    expect(result.current.items[1].record.error).toContain('has not been assessed');
    expect(result.current.summary.pendingCount).toBe(2);
  });

  it('clears the name and aborts analysis without letting old completion unlock a newer operation', async () => {
    const oldParse = deferred<Awaited<ReturnType<typeof readPdf>>>();
    const newParse = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(oldParse.promise).mockReturnValueOnce(newParse.promise);
    const { result } = renderHook(() => usePreparationSession());
    let oldAdd!: Promise<void>;
    let newAdd!: Promise<void>;
    act(() => { result.current.setProjectName('Custom project'); oldAdd = result.current.addFiles([pdf()]); });
    act(() => { result.current.clear(); newAdd = result.current.addFiles([pdf('A102.pdf')]); });
    expect(result.current.projectName).toBe('My preparation set');
    expect(vi.mocked(readPdf).mock.calls[0][1].aborted).toBe(true);
    await act(async () => { oldParse.resolve(parsed()); await oldAdd; });
    expect(result.current.working).toBe(true);
    expect(result.current.items[0].record).toMatchObject({ originalName: 'A102.pdf', status: 'analyzing' });
    await act(async () => { newParse.resolve(parsed()); await newAdd; });
    expect(result.current.items[0].record.status).toBe('complete');
    expect(result.current.busy).toBe(false);
  });

  it('returns demo success without changing the project name and rejects repeated loading', async () => {
    const demo = deferred<File[]>();
    vi.mocked(createDemoFiles).mockReturnValueOnce(demo.promise);
    const { result } = renderHook(() => usePreparationSession());
    act(() => result.current.setProjectName('Onboarding project'));
    let loading!: Promise<boolean>;
    act(() => { loading = result.current.loadDemo(); });
    expect(await result.current.loadDemo()).toBe(false);
    await waitFor(() => expect(createDemoFiles).toHaveBeenCalledTimes(1));
    await act(async () => { demo.resolve([pdf()]); expect(await loading).toBe(true); });
    expect(result.current.items[0].demo).toBe(true);
    expect(result.current.projectName).toBe('Onboarding project');
    expect(result.current.busy).toBe(false);
  });

  it('reports demo generation failure and admission failure as false', async () => {
    vi.mocked(createDemoFiles).mockRejectedValueOnce(new Error('generation failed'));
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { expect(await result.current.loadDemo()).toBe(false); });
    expect(result.current.error).toContain('could not be generated');
    vi.mocked(createDemoFiles).mockResolvedValueOnce([sizedPdf(LIMITS.maxFileBytes + 1)]);
    await act(async () => { expect(await result.current.loadDemo()).toBe(false); });
    expect(result.current.error).toContain('25 MB or smaller');
    expect(result.current.busy).toBe(false);
  });

  it('does not add a demo that finishes generation after clear', async () => {
    const demo = deferred<File[]>();
    vi.mocked(createDemoFiles).mockReturnValueOnce(demo.promise);
    const { result } = renderHook(() => usePreparationSession());
    let loading!: Promise<boolean>;
    act(() => { loading = result.current.loadDemo(); });
    await waitFor(() => expect(createDemoFiles).toHaveBeenCalledTimes(1));
    act(() => result.current.clear());
    await act(async () => { demo.resolve([pdf()]); expect(await loading).toBe(false); });
    expect(result.current.items).toEqual([]);
    expect(result.current.notice).toContain('Session cleared');
    expect(readPdf).not.toHaveBeenCalled();
  });

  it('replaces a source with a new revision and enforces replacement size limits', async () => {
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { await result.current.addFiles([pdf()], true); });
    const id = result.current.items[0].record.id;
    await act(async () => { await result.current.replaceFile(id, sizedPdf(LIMITS.maxFileBytes + 1)); });
    expect(result.current.error).toContain('Replacement exceeds');
    expect(result.current.items[0].record.revision).toBe(1);
    await act(async () => { await result.current.replaceFile(id, pdf('A103.pdf')); });
    expect(result.current.items[0]).toMatchObject({ demo: true, record: { id, revision: 2, originalName: 'A103.pdf', exportName: 'A103.pdf', status: 'complete' } });
    expect(result.current.error).toBe('');
    expect(result.current.notice).toContain('Replacement analyzed');
  });

  it('corrects a sample once and never resurrects a source removed during sample generation', async () => {
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { expect(await result.current.loadDemo()).toBe(true); });
    const id = result.current.items[0].record.id;
    await act(async () => { await result.current.correctDemo(id); });
    expect(result.current.items[0].record).toMatchObject({ revision: 2, originalName: 'A101-corrected.pdf' });
    const corrected = deferred<File>();
    vi.mocked(createCorrectedPlan).mockReturnValueOnce(corrected.promise);
    let correcting!: Promise<void>;
    act(() => { correcting = result.current.correctDemo(id); void result.current.correctDemo(id); });
    await waitFor(() => expect(createCorrectedPlan).toHaveBeenCalledTimes(2));
    act(() => result.current.remove(id));
    await act(async () => { corrected.resolve(pdf()); await correcting; });
    expect(result.current.items).toEqual([]);
    expect(readPdf).toHaveBeenCalledTimes(2);
    expect(result.current.busy).toBe(false);
  });

  it('auto-classifies code checklists and small multi-page documents as supporting unless manually overridden', async () => {
    vi.mocked(readPdf)
      .mockResolvedValueOnce({
        hash: 'a'.repeat(64),
        pages: Array.from({ length: 5 }, (_, index) => ({
          page: index + 1,
          widthInches: 8.5,
          heightInches: 14,
          rotation: 0,
          text: 'REVIEW TYPE CODE TITLE SECTION CHECKLIST SUMMARY',
        })),
      })
      .mockResolvedValueOnce({
        hash: 'b'.repeat(64),
        pages: [
          { page: 1, widthInches: 8.5, heightInches: 11, rotation: 0, text: 'Owner letter page 1' },
          { page: 2, widthInches: 8.5, heightInches: 11, rotation: 0, text: 'Owner letter page 2' },
        ],
      });
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => {
      await result.current.addFiles([
        pdf('code-checklist__CIV-RHHZMD3-26.pdf'),
        pdf('Owner Authorization.pdf'),
      ]);
    });
    expect(result.current.items[0].record.kind).toBe('supporting');
    expect(result.current.items[1].record.kind).toBe('supporting');
    act(() => { result.current.classify(result.current.items[1].record.id, 'plan'); });
    expect(result.current.items[1].record.kind).toBe('plan');
  });

  it('exports one independent validated snapshot and prevents edits and duplicate actions during export', async () => {
    const exporting = deferred<Uint8Array>();
    vi.mocked(buildPackage).mockReturnValueOnce(exporting.promise);
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { await result.current.addFiles([pdf()]); });
    act(() => result.current.setProjectName('Named preparation'));
    const item = result.current.items[0];
    let download!: Promise<void>;
    act(() => {
      download = result.current.exportPackage();
      void result.current.exportPackage();
      result.current.remove(item.record.id);
      result.current.rename(item.record.id, 'ignored.pdf');
      result.current.classify(item.record.id, 'supporting');
    });
    await waitFor(() => expect(buildPackage).toHaveBeenCalledTimes(1));
    const [name, snapshot, findings] = vi.mocked(buildPackage).mock.calls[0];
    expect(name).toBe('Named preparation');
    expect(snapshot[0].record).toEqual(item.record);
    expect(snapshot[0].record).not.toBe(item.record);
    expect(snapshot[0].record.pages[0]).not.toBe(item.record.pages[0]);
    expect(findings).toEqual(result.current.summary.findings);
    expect(result.current.items[0].record.exportName).toBe('A101.pdf');
    expect(result.current.items[0].record.kind).toBe('plan');
    expect(result.current.exporting).toBe(true);
    await act(async () => { exporting.resolve(new Uint8Array([4])); await download; });
    expect(downloadBytes).toHaveBeenCalledWith(new Uint8Array([4]), 'HNL-prescreen-package.zip', 'application/zip');
    expect(result.current.notice).toContain('Package downloaded');
    expect(result.current.busy).toBe(false);
  });

  it('surfaces snapshot validation errors and never downloads a rejected package', async () => {
    vi.mocked(buildPackage).mockRejectedValueOnce(new Error('Every source must have complete analysis'));
    const { result } = renderHook(() => usePreparationSession());
    await act(async () => { await result.current.exportPackage(); });
    expect(result.current.error).toBe('Every source must have complete analysis');
    expect(downloadBytes).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('suppresses stale export completion and finalization after clear starts another export', async () => {
    const oldExport = deferred<Uint8Array>();
    const newExport = deferred<Uint8Array>();
    vi.mocked(buildPackage).mockReturnValueOnce(oldExport.promise).mockReturnValueOnce(newExport.promise);
    const { result } = renderHook(() => usePreparationSession());
    let oldDownload!: Promise<void>;
    let newDownload!: Promise<void>;
    act(() => { oldDownload = result.current.exportPackage(); });
    await waitFor(() => expect(buildPackage).toHaveBeenCalledTimes(1));
    act(() => { result.current.clear(); newDownload = result.current.exportPackage(); });
    await waitFor(() => expect(buildPackage).toHaveBeenCalledTimes(2));
    await act(async () => { oldExport.resolve(new Uint8Array([1])); await oldDownload; });
    expect(downloadBytes).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(true);
    await act(async () => { newExport.resolve(new Uint8Array([2])); await newDownload; });
    expect(downloadBytes).toHaveBeenCalledTimes(1);
    expect(result.current.exporting).toBe(false);
  });

  it('only warns before unload with files, removes the listener, and aborts on unmount', async () => {
    const pending = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => usePreparationSession());
    const warn = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(warn()).toBe(false);
    let adding!: Promise<void>;
    act(() => { adding = result.current.addFiles([pdf()]); });
    expect(warn()).toBe(true);
    unmount();
    expect(vi.mocked(readPdf).mock.calls[0][1].aborted).toBe(true);
    expect(warn()).toBe(false);
    await act(async () => { pending.resolve(parsed()); await adding; });
  });

  it('never downloads after unmount during package creation', async () => {
    const pending = deferred<Uint8Array>();
    vi.mocked(buildPackage).mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => usePreparationSession());
    let exporting!: Promise<void>;
    act(() => { exporting = result.current.exportPackage(); });
    await waitFor(() => expect(buildPackage).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { pending.resolve(new Uint8Array([1])); await exporting; });
    expect(downloadBytes).not.toHaveBeenCalled();
  });
});
