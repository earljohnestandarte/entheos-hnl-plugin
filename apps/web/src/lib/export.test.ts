import { createHash } from 'node:crypto';
import type { DocumentRecord, Finding } from '@hnl/contracts';
import { strFromU8, unzipSync } from 'fflate';
import { decodePDFRawStream, PDFDocument, PDFPage, PDFRawStream } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCorrectedPlan, createDemoFiles } from './demo';
import { buildPackage, downloadBytes, type SourceDocument } from './export';

async function source(file?: File, overrides: Partial<DocumentRecord> = {}): Promise<SourceDocument> {
  const original = file ?? await createCorrectedPlan();
  const bytes = new Uint8Array(await original.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  return {
    file: original,
    record: {
      id: 'source-1', revision: 1, originalName: original.name, exportName: original.name,
      kind: 'plan', bytes: original.size, hash: createHash('sha256').update(bytes).digest('hex'),
      status: 'complete',
      pages: pdf.getPages().map((page, index) => ({
        page: index + 1, widthInches: page.getWidth() / 72, heightInches: page.getHeight() / 72,
        rotation: page.getRotation().angle, text: 'Synthetic demonstration text.',
      })),
      ...overrides,
    },
  };
}

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1', ruleId: 'manual-review', category: 'review',
    title: 'Manually inspect', detail: 'Evidence requires review.', action: 'Check in portal.',
    source: 'Synthetic demo rule', fileId: 'source-1', revision: 1, page: 1,
    ...overrides,
  };
}

function drawnText(pdf: PDFDocument): string {
  return pdf.context.enumerateIndirectObjects()
    .flatMap(([, value]) => value instanceof PDFRawStream
      ? [new TextDecoder().decode(decodePDFRawStream(value).decode())] : [])
    .flatMap((stream) => [...stream.matchAll(/<([0-9a-f]+)>\s*Tj/gi)]
      .map((match) => Buffer.from(match[1], 'hex').toString('latin1')))
    .join('\n');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('buildPackage', () => {
  it('labels a mixed test package and omits full extracted page text from every reference', async () => {
    const marker = 'SYNTHETIC_UNRELATED_PAGE_TEXT';
    const sample = await source();
    sample.record.pages[0].text = marker;
    const testFile = await createCorrectedPlan();
    const test = await source(new File([await testFile.arrayBuffer()], 'A102 - Test.pdf'), { id: 'user-test' });
    const entries = unzipSync(await buildPackage('Mixed', [
      { ...sample, syntheticSample: true },
      { ...test, syntheticSample: false },
    ], []));
    const manifest = JSON.parse(strFromU8(entries['reference/manifest.json']));
    expect(manifest).toMatchObject({ schemaVersion: 2, testOnly: true, documents: [
      { provenance: 'synthetic-sample' }, { provenance: 'user-supplied-test' },
    ] });
    expect(manifest.documents[0].pages[0]).not.toHaveProperty('text');
    expect(strFromU8(entries['reference/guide.txt'])).toContain('TEST-ONLY');
    expect(strFromU8(entries['reference/findings.csv'])).not.toContain(marker);
    const report = await PDFDocument.load(entries['reference/readiness.pdf']);
    expect(drawnText(report)).not.toContain(marker);
  });

  it('separates source uploads from references and preserves source bytes and file metadata', async () => {
    const files = await createDemoFiles();
    const plan = await source(files[0], { id: 'title', revision: 2 });
    const supporting = await source(files[2], { id: 'form', kind: 'supporting' });
    const before = structuredClone([plan.record, supporting.record]);
    const issues = [finding({ fileId: 'title', revision: 2, category: 'fix' }), finding({ id: 'manual', fileId: 'form', page: 3 })];
    const entries = unzipSync(await buildPackage('Example project', [plan, supporting], issues));
    expect(Object.keys(entries).sort()).toEqual([
      'reference/findings.csv', 'reference/guide.txt', 'reference/manifest.json', 'reference/readiness.pdf',
      'upload/plan/000 - Title Sheet.pdf', 'upload/supporting/Supporting Form.pdf',
    ]);
    expect(entries['upload/plan/000 - Title Sheet.pdf']).toEqual(new Uint8Array(await plan.file.arrayBuffer()));
    expect(entries['upload/supporting/Supporting Form.pdf']).toEqual(new Uint8Array(await supporting.file.arrayBuffer()));
    expect([plan.record, supporting.record]).toEqual(before);
    expect(plan.file.name).toBe('000 - Title Sheet.pdf');
    const manifest = JSON.parse(strFromU8(entries['reference/manifest.json']));
    expect(manifest).toMatchObject({
      syntheticDemo: true, applicationPersistence: false, complianceAssessed: false,
      submissionReady: false, referenceFilesAreUploadCandidates: false,
      projectName: 'Example project', unresolved: { fix: 1, review: 1, notAssessed: 0 },
      rulePack: { id: 'hnl-preparation-demo', version: '0.3.0' },
      libraries: { 'pdf-lib': '1.17.1', fflate: '0.8.3' },
    });
    expect(manifest.projectRevision).toMatch(/^[a-f\d]{64}$/);
    expect(Number.isFinite(Date.parse(manifest.exportedAt))).toBe(true);
    expect(manifest.documents[0]).toMatchObject({
      revision: 2, hash: plan.record.hash, originalName: plan.file.name,
      path: 'upload/plan/000 - Title Sheet.pdf', sourceBytesPreserved: true,
    });
    expect(Number.isFinite(Date.parse(manifest.documents[0].sourceLastModified))).toBe(true);
    const guide = strFromU8(entries['reference/guide.txt']);
    expect(guide).toContain('SYNTHETIC-DEMO');
    expect(guide).toContain('Keep the ZIP, test PDFs, and reference reports out of CivCheck and HNL Build');
    expect(guide).toContain('Plan/Other');
    expect(guide).toContain('suggested document types, page ranges, and title-block evidence');
    expect(guide).toContain('creates no CivCheck ID, certificate of completion, or CivCheck-watermarked plans');
    const csv = strFromU8(entries['reference/findings.csv']);
    expect(csv).toContain('"fileName","page","revision"');
    expect(csv).toContain('"Supporting Form.pdf","3","1"');
    const pdf = await PDFDocument.load(entries['reference/readiness.pdf']);
    expect(drawnText(pdf)).toContain('SYNTHETIC-DEMO PACKAGE');
    expect(drawnText(pdf)).toContain('REFERENCE ONLY - NOT FOR UPLOAD');
  });

  it('allows incomplete fixes/manual review with an explicit non-compliance disclaimer and preserves renamed bytes', async () => {
    const input = await source(undefined, { exportName: 'A102 - Renamed Plan.pdf' });
    const entries = unzipSync(await buildPackage('Incomplete', [input], [finding({ category: 'fix' }), finding({ id: 'review-2' })]));
    expect(entries['upload/plan/A102 - Renamed Plan.pdf']).toEqual(new Uint8Array(await input.file.arrayBuffer()));
    expect(input.file.name).toBe('A101 - Floor Plan.pdf');
    expect(strFromU8(entries['reference/guide.txt'])).toContain('Unresolved findings: 1 fix; 1 manual');
    expect(strFromU8(entries['reference/manifest.json'])).toContain('does not establish completeness, code compliance');
  });

  it.each(['../escape.pdf', 'nested/file.pdf', 'nested\\file.pdf', '/absolute.pdf', 'C:\\file.pdf', 'NUL.pdf', 'file.pdf\u0000'])('rejects unsafe export names: %s', async (exportName) => {
    const input = await source(undefined, { exportName });
    await expect(buildPackage('Demo', [input], [])).rejects.toThrow(/unsafe export filename/i);
  });

  it('rejects case-insensitive collisions even between plan and supporting folders', async () => {
    const first = await source(undefined, { exportName: 'Example.pdf' });
    const second = await source(undefined, { id: 'source-2', kind: 'supporting', exportName: 'EXAMPLE.PDF' });
    await expect(buildPackage('Demo', [first, second], [])).rejects.toThrow(/duplicate export filename/i);
  });

  it('verifies real SHA-256 hashes rather than accepting same-sized replacement bytes', async () => {
    const input = await source();
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    bytes[bytes.length - 1] ^= 1;
    input.file = new File([bytes], input.file.name, { type: 'application/pdf' });
    expect(input.file.size).toBe(input.record.bytes);
    await expect(buildPackage('Demo', [input], [])).rejects.toThrow(/sha-256 hash/i);
    input.record.hash = 'not-a-hash';
    await expect(buildPackage('Demo', [input], [])).rejects.toThrow(/real SHA-256/i);
  });

  it('rejects changed original filenames, byte counts, missing pages and duplicate source IDs', async () => {
    const input = await source();
    const renamed = new File([await input.file.arrayBuffer()], 'Renamed.pdf', { type: 'application/pdf' });
    await expect(buildPackage('Demo', [{ ...input, file: renamed }], [])).rejects.toThrow(/original filename/i);
    await expect(buildPackage('Demo', [{ ...input, record: { ...input.record, bytes: 1 } }], [])).rejects.toThrow(/byte count/i);
    await expect(buildPackage('Demo', [{ ...input, record: { ...input.record, pages: [] } }], [])).rejects.toThrow(/page analysis/i);
    const second = await source(undefined, { exportName: 'A102 - Other.pdf' });
    await expect(buildPackage('Demo', [input, second], [])).rejects.toThrow(/duplicate source document ID/i);
  });

  it.each(['analyzing', 'error', 'unsupported'] as const)('rejects %s records instead of omitting them', async (status) => {
    const valid = await source();
    const incomplete = await source(undefined, { id: 'incomplete', exportName: 'A102 - Other.pdf', status });
    await expect(buildPackage('Demo', [valid, incomplete], [])).rejects.toThrow(/complete analysis/i);
  });

  it('rejects an empty package and stale or invalid finding links', async () => {
    await expect(buildPackage('Demo', [], [])).rejects.toThrow(/at least one/i);
    const input = await source();
    await expect(buildPackage('Demo', [input], [finding({ revision: 2 })])).rejects.toThrow(/stale source revision/i);
    await expect(buildPackage('Demo', [input], [finding({ fileId: 'absent' })])).rejects.toThrow(/absent/i);
    await expect(buildPackage('Demo', [input], [finding({ page: 2 })])).rejects.toThrow(/invalid source page/i);
  });

  it('neutralizes CSV formulas in every user-controlled field, including leading whitespace', async () => {
    const input = await source();
    const dangerous = finding({
      title: '=SUM(1,2)', detail: ' \t@SUM(1,2)', action: '+cmd', source: '-formula',
      ruleId: 'He said "quoted"\nnext line',
    });
    const entries = unzipSync(await buildPackage('Demo', [input], [dangerous]));
    const csv = strFromU8(entries['reference/findings.csv']);
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"\' \t@SUM(1,2)"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'-formula"');
    expect(csv).toContain('"He said ""quoted""\nnext line"');
  });

  it('sanitizes Unicode/control characters and paginates long unbroken report text without overflow', async () => {
    const pdf = await createCorrectedPlan();
    const unusualName = '測試 🏠 café\u0000 original.pdf';
    const unusual = new File([await pdf.arrayBuffer()], unusualName, { type: 'application/pdf' });
    const input = await source(unusual, { exportName: 'A101 - Floor Plan.pdf' });
    const longDetail = `測試 🏠 café “quotes”\u0000\r\n${'W'.repeat(15_000)}`;
    const widths: number[] = [];
    const positions: number[] = [];
    const originalDraw = PDFPage.prototype.drawText;
    const widthSpy = vi.spyOn(PDFPage.prototype, 'drawText').mockImplementation(function (this: PDFPage, text, options) {
      if (options?.font && options.size !== undefined) widths.push(options.font.widthOfTextAtSize(text, options.size));
      if (options?.y !== undefined) positions.push(options.y);
      return originalDraw.call(this, text, options);
    });
    const entries = unzipSync(await buildPackage('Projet 測試 🏠 café\u0000', [input], [finding({ detail: longDetail })]));
    widthSpy.mockRestore();
    const report = await PDFDocument.load(entries['reference/readiness.pdf']);
    expect(report.getPageCount()).toBeGreaterThan(2);
    expect(report.getPages().every((page) => page.getWidth() === 612 && page.getHeight() === 792)).toBe(true);
    const text = drawnText(report);
    expect(text).toContain('cafe');
    expect(text.replace(/\n/g, '')).toContain('[Truncated in PDF; see manifest/CSV for full text.]');
    expect(text).not.toContain('\u0000');
    expect(text).toContain('unsupported Unicode is replaced with ?');
    expect(text.match(/REFERENCE ONLY - NOT FOR UPLOAD/g)).toHaveLength(report.getPageCount());
    // Measure the actual emitted lines, not merely the wrapping input.
    expect(widths.length).toBeGreaterThan(0);
    expect(Math.max(...widths)).toBeLessThanOrEqual(516.01);
    expect(Math.min(...positions)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...positions)).toBeLessThanOrEqual(754);
    expect(JSON.parse(strFromU8(entries['reference/manifest.json'])).findings[0].detail).toBe(longDetail);
    expect(strFromU8(entries['reference/findings.csv'])).toContain('測試');
  });

  it('labels non-demo user exports as local preparation packages without synthetic-demo branding', async () => {
    const input = await source();
    const entries = unzipSync(await buildPackage('Sickels Residence', [input], [], { syntheticDemo: false }));
    const manifest = JSON.parse(strFromU8(entries['reference/manifest.json']));
    expect(manifest.syntheticDemo).toBe(false);
    expect(manifest.packageLabel).toBe('LOCAL PREPARATION PACKAGE - TEST-ONLY');
    expect(strFromU8(entries['reference/guide.txt'])).toContain('LOCAL PREPARATION PACKAGE');
    expect(drawnText(await PDFDocument.load(entries['reference/readiness.pdf']))).toContain('LOCAL PREPARATION PACKAGE');
  });

  it('derives a stable snapshot revision that changes with filenames, file revisions, or findings', async () => {
    const input = await source();
    const revision = async (documents: SourceDocument[], findings: Finding[]) => {
      const entries = unzipSync(await buildPackage('Demo', documents, findings));
      return JSON.parse(strFromU8(entries['reference/manifest.json'])).projectRevision as string;
    };
    const first = await revision([input], []);
    expect(await revision([input], [])).toBe(first);
    expect(await revision([{ ...input, record: { ...input.record, exportName: 'A102 - Renamed.pdf' } }], [])).not.toBe(first);
    expect(await revision([{ ...input, record: { ...input.record, revision: 2 } }], [])).not.toBe(first);
    expect(await revision([input], [finding()])).not.toBe(first);
  });
});

describe('downloadBytes', () => {
  it('is unavailable outside the browser', () => {
    expect(() => downloadBytes(new Uint8Array([1]), 'demo.zip', 'application/zip')).toThrow(/only in a browser/i);
  });

  it('downloads a byte-exact Blob and cleans up the link and object URL', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    const anchor = { href: '', download: '', style: { display: '' }, click, remove };
    vi.stubGlobal('window', { setTimeout });
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { append } });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:demo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    downloadBytes(new Uint8Array([0, 1, 255]), 'demo.zip', 'application/zip');
    expect(anchor.href).toBe('blob:demo');
    expect(anchor.download).toBe('demo.zip');
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0];
    if (!(blob instanceof Blob)) throw new Error('Expected a download Blob.');
    expect(blob.type).toBe('application/zip');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([0, 1, 255]));
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:demo');
  });
});
