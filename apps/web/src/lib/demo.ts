import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const INCH = 72;
const SYNTHETIC = 'SYNTHETIC DEMO - NOT FOR CONSTRUCTION OR SUBMISSION';
const ink = rgb(0.15, 0.18, 0.22);

async function newDemo(title: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${title} (SYNTHETIC DEMO)`);
  pdf.setAuthor('Example Owner - synthetic demonstration');
  pdf.setCreator('HNL preparation demo');
  pdf.setSubject('Entirely synthetic example; no real property or permit application.');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { pdf, font, bold };
}

function text(page: PDFPage, font: PDFFont, value: string, x: number, y: number, size = 24) {
  page.drawText(value, { x, y, size, font, color: ink });
}

function titleBlock(page: PDFPage, font: PDFFont, bold: PDFFont, sheet: string, title: string) {
  // Keep all graphics below the top-right corner. This is a drawing choice,
  // not a measurement or a claim that approval-stamp clearance was verified.
  page.drawRectangle({
    x: 72, y: 72, width: page.getWidth() - 144, height: 230,
    borderWidth: 2, borderColor: ink,
  });
  text(page, bold, `${sheet} | ${title} | SYNTHETIC PROJECT`, 100, 252, 30);
  text(page, font, 'Project address: 123 Example Lane, Honolulu, HI (SYNTHETIC)', 100, 208);
  text(page, font, 'Owner: Example Owner | TMK: DEMO-ONLY', 100, 170);
  text(page, font, 'Project description: Imaginary floor plan for a local software demonstration.', 100, 132, 22);
  text(page, font, SYNTHETIC, 100, 94, 20);
}

async function fileFromPdf(pdf: PDFDocument, name: string): Promise<File> {
  const bytes = await pdf.save();
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

async function titleSheet(): Promise<File> {
  const { pdf, font, bold } = await newDemo('Title Sheet');
  const page = pdf.addPage([36 * INCH, 24 * INCH]);
  text(page, bold, 'Title Sheet', 100, page.getHeight() - 130, 42);
  text(page, font, 'SYNTHETIC DEMONSTRATION - An invented project for local practice.', 100, page.getHeight() - 185, 26);
  text(page, bold, 'SHEET INDEX', 100, 1330, 36);
  text(page, font, '000 - Title Sheet', 100, 1270, 28);
  text(page, font, 'A101 - Floor Plan (illustrative only)', 100, 1220, 28);
  text(page, bold, 'EXAMPLE PROJECT DATA', 100, 1060, 36);
  text(page, font, 'FAR: 0.25 (synthetic illustrative value; not a code determination)', 100, 1000, 26);
  text(page, font, 'No zoning, flood, ownership, or regulatory assertions are made.', 100, 950, 26);
  text(page, font, 'Review required documents and evidence manually in the actual portal.', 100, 900, 26);
  titleBlock(page, font, bold, '000', 'Title Sheet');
  return fileFromPdf(pdf, '000 - Title Sheet.pdf');
}

async function floorPlan(corrected: boolean): Promise<File> {
  const { pdf, font, bold } = await newDemo('Floor Plan');
  const page = pdf.addPage(corrected ? [36 * INCH, 24 * INCH] : [24 * INCH, 36 * INCH]);
  text(page, bold, 'A101 - FLOOR PLAN', 100, page.getHeight() - 130, 38);
  text(page, font, 'SYNTHETIC DEMO - imaginary rooms; not to scale.', 100, page.getHeight() - 185, 25);
  text(page, font, corrected
    ? 'Replacement example: landscape sheet and corrected filename only.'
    : 'Intentional demo issues: portrait orientation and an ampersand in the filename.',
  100, page.getHeight() - 235, 23);
  page.drawRectangle({ x: 150, y: 500, width: 1100, height: 700, borderWidth: 4, borderColor: ink });
  page.drawLine({ start: { x: 700, y: 500 }, end: { x: 700, y: 1200 }, thickness: 3, color: ink });
  text(page, font, 'EXAMPLE ROOM A', 220, 850, 28);
  text(page, font, 'EXAMPLE ROOM B', 770, 850, 28);
  text(page, font, 'Illustration only. No dimensions, design, or code compliance are certified.', 150, 420, 23);
  titleBlock(page, font, bold, 'A101', 'Floor Plan');
  return fileFromPdf(pdf, corrected ? 'A101 - Floor Plan.pdf' : 'A101 & Floor Plan.pdf');
}

async function supportingForm(): Promise<File> {
  const { pdf, font, bold } = await newDemo('Supporting Form');
  for (let index = 1; index <= 3; index += 1) {
    const page = pdf.addPage([8.5 * INCH, 11 * INCH]);
    text(page, bold, 'SYNTHETIC DEMO', 48, 724, 22);
    text(page, bold, `Supporting Form - page ${index} of 3`, 48, 680, 19);
    text(page, font, 'Not an official form. Not for submission.', 48, 644, 13);
    text(page, font, 'Example Owner | TMK: DEMO-ONLY', 48, 594, 13);
    text(page, font, '123 Example Lane (SYNTHETIC)', 48, 568, 13);
    text(page, font, 'Illustrates a multi-page, letter-size supporting document.', 48, 516, 12);
    text(page, font, 'No project-specific document requirement or assignment is implied.', 48, 492, 12);
    text(page, font, `Example section ${index}: ___________________________________`, 48, 422, 13);
    text(page, font, 'Notes: __________________________________________________', 48, 370, 13);
    text(page, font, '________________________________________________________', 48, 318, 13);
    text(page, font, 'SYNTHETIC DEMO - NOT FOR CONSTRUCTION OR SUBMISSION', 48, 60, 10);
  }
  return fileFromPdf(pdf, 'Supporting Form.pdf');
}

/** Locally generated originals; no network, real property data, or third-party samples. */
export async function createDemoFiles(): Promise<File[]> {
  return Promise.all([titleSheet(), floorPlan(false), supportingForm()]);
}

/** Corrects the demonstration filename and orientation, not the design or compliance. */
export async function createCorrectedPlan(): Promise<File> {
  return floorPlan(true);
}
