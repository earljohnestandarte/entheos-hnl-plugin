import { decodePDFRawStream, PDFDocument, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createCorrectedPlan, createDemoFiles } from './demo';

function drawnText(pdf: PDFDocument): string {
  return pdf.context.enumerateIndirectObjects()
    .flatMap(([, value]) => value instanceof PDFRawStream
      ? [new TextDecoder().decode(decodePDFRawStream(value).decode())] : [])
    .flatMap((stream) => [...stream.matchAll(/<([0-9a-f]+)>\s*Tj/gi)]
      .map((match) => Buffer.from(match[1], 'hex').toString('latin1')))
    .join('\n');
}

describe('synthetic demo PDFs', () => {
  it('creates the three requested original PDFs with exact page counts and sizes', async () => {
    const files = await createDemoFiles();
    expect(files.map((file) => file.name)).toEqual([
      '000 - Title Sheet.pdf', 'A101 & Floor Plan.pdf', 'Supporting Form.pdf',
    ]);
    const dimensions = [
      [[36 * 72, 24 * 72]],
      [[24 * 72, 36 * 72]],
      [[612, 792], [612, 792], [612, 792]],
    ];
    for (const [index, file] of files.entries()) {
      expect(file.type).toBe('application/pdf');
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      expect(pdf.getPages().map((page) => [page.getWidth(), page.getHeight()])).toEqual(dimensions[index]);
      expect(pdf.getPages().every((page) => page.getRotation().angle === 0)).toBe(true);
      expect(pdf.getTitle()).toContain('SYNTHETIC');
      expect(drawnText(pdf)).toContain('SYNTHETIC');
      expect(drawnText(pdf)).toContain('NOT FOR CONSTRUCTION OR SUBMISSION');
    }
    const title = drawnText(await PDFDocument.load(await files[0].arrayBuffer()));
    expect(title).toContain('123 Example Lane, Honolulu, HI (SYNTHETIC)');
    expect(title).toContain('Example Owner');
    expect(title).toContain('TMK: DEMO-ONLY');
    expect(title).toContain('FAR: 0.25');
    expect(title).toContain('SHEET INDEX');
    expect(title).toContain('000 | Title Sheet | SYNTHETIC PROJECT');
    const form = drawnText(await PDFDocument.load(await files[2].arrayBuffer()));
    expect(form.match(/SYNTHETIC DEMO - NOT FOR CONSTRUCTION OR SUBMISSION/g)).toHaveLength(3);
    expect(form).toContain('Not an official form. Not for submission.');
  });

  it('creates a new landscape replacement with a safe corrected filename, not a compliance claim', async () => {
    const file = await createCorrectedPlan();
    expect(file.name).toBe('A101 - Floor Plan.pdf');
    expect(file.type).toBe('application/pdf');
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 2592, height: 1728 });
    expect(drawnText(pdf)).toContain('A101 - FLOOR PLAN');
    expect(drawnText(pdf)).toContain('SYNTHETIC DEMO');
    expect(drawnText(pdf)).toContain('landscape sheet and corrected filename only');
    expect(drawnText(pdf)).toContain('No dimensions, design, or code compliance are certified');
  });
});
