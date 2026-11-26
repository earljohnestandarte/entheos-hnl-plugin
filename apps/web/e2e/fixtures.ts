import { PDFDocument } from 'pdf-lib';

export async function testPdf(name: string, pageLines: string[][], plan = true) {
  const pdf = await PDFDocument.create();
  const fixtureDate = new Date('2026-01-01T00:00:00Z');
  pdf.setCreationDate(fixtureDate);
  pdf.setModificationDate(fixtureDate);
  const size: [number, number] = plan ? [2592, 1728] : [612, 792];
  for (const lines of pageLines) {
    const page = pdf.addPage(size);
    if (lines.length === 0) {
      page.drawRectangle({ x: 60, y: 100, width: 180, height: 100 });
    } else {
      page.drawText(lines.join('\n'), { x: 60, y: size[1] - 90, size: 24, lineHeight: 36 });
    }
  }
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
}

export async function permitFixture() {
  const sheets = [
    ['A101', 'Existing Floor Plan'],
    ['A102', 'New Floor Plan'],
    ['A103', 'Roof Plan'],
    ['A201', 'Exterior Elevations'],
    ['A301', 'Building Sections'],
    ['C104', 'Site Plan'],
    ['H101', 'Mechanical Plan'],
    ['R301', 'Roof Details'],
    ['S101', 'Foundation Plan'],
  ];
  return Promise.all([
    testPdf('001 - Title Sheet_Index_Data Table.pdf', [[
      'Title Sheet', 'Sheet Index', '001 Title Sheet', ...sheets.map(([id, title]) => `${id} - ${title}`),
      'Project address: 123 Example Lane, Honolulu, HI (SYNTHETIC)',
      'Owner: Example Owner | TMK: DEMO-ONLY',
      'UNRELATED_SYNTHETIC_PAGE_TEXT',
    ]]),
    ...sheets.map(([id, title]) => testPdf(`${id} - ${title}.pdf`, [[title, 'Owner: Example Owner']])),
    testPdf('Supporting Test Forms.pdf', [['Appendix B'], ['Appendix B'], ['Appendix G1']], false),
    testPdf('Supporting Notes.pdf', [['Supporting Form']], false),
  ]);
}
