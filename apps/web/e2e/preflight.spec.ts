import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, totalmem, version } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { permitFixture, testPdf } from './fixtures';

async function start(page: Page, sample = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose PDF files' })).toBeEnabled();
  if (sample) {
    await page.getByRole('button', { name: 'Try the guided sample' }).click();
    await expect(page.getByText(/File analysis finished/)).toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Local preparation steps' })).toBeVisible();
}

function step(page: Page, name: RegExp) {
  return page.getByRole('navigation', { name: 'Local preparation steps' }).getByRole('button', { name });
}

test('rehearses the guided handoff, opens its evidence, and downloads a test-only ZIP', async ({ page }, info) => {
  await start(page, true);
  const help = page.getByRole('button', { name: 'How it works' });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Checked locally' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeFocused();
  await step(page, /Fix & review/).click();
  await page.getByRole('tab', { name: /^Findings/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Extracted values/ })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: /Extracted values/ })).toBeVisible();
  await step(page, /Prepare for CivCheck/).click();
  const downloadButton = page.getByRole('button', { name: 'Download preparation ZIP' });
  await expect(downloadButton).toBeDisabled();
  await expect(page.getByText(/Unsafe export filename/)).toBeVisible();
  await step(page, /Add plans/).click();
  await page.getByRole('button', { name: 'Use corrected sample PDF' }).click();
  await expect(page.getByRole('article', { name: 'A101 - Floor Plan.pdf' })).toBeVisible();
  await step(page, /Prepare for CivCheck/).click();
  const checklist = page.getByRole('region', { name: 'CivCheck handoff checklist' });
  await expect(checklist.getByRole('listitem').filter({ hasText: '000 - Title Sheet.pdf · Plan' }).first()).toBeVisible();
  await expect(checklist.getByText('· Pages 1–3', { exact: false })).toBeVisible();
  const evidence = checklist.getByRole('button', { name: '000 - Title Sheet.pdf, p. 1' }).first();
  await evidence.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('canvas')).toBeVisible();
  await expect(dialog.getByText(/Page 1 of 1/)).toBeVisible();
  const fittedPixels = await dialog.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width);
  await dialog.getByRole('button', { name: 'Zoom in' }).click();
  await expect(dialog.getByText('150%', { exact: true })).toBeVisible();
  await expect(dialog.locator('canvas')).toBeVisible();
  expect(await dialog.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(fittedPixels);
  await dialog.getByRole('searchbox', { name: 'Find in extracted text' }).fill('Example Owner');
  await dialog.getByRole('button', { name: 'Next result' }).click();
  await expect(dialog.locator('mark').first()).toHaveText('Example Owner');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(evidence).toBeFocused();
  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
  expect(download.suggestedFilename()).toBe('HNL-preflight-sample-test-only.zip');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new DOMException('Test clipboard unavailable', 'NotAllowedError'); } },
  }));
  await checklist.getByRole('button', { name: 'Copy handoff checklist' }).click();
  await expect(checklist.getByText(/Clipboard access failed/)).toBeVisible();
  const [textFile] = await Promise.all([
    page.waitForEvent('download'), checklist.getByRole('button', { name: 'Download checklist TXT' }).click(),
  ]);
  const notes = await readFile((await textFile.path())!, 'utf8');
  expect(notes).toContain('TEST ONLY');
  expect(notes).toContain('1. upload/plan/000 - Title Sheet.pdf');
  expect(notes).toContain('Supporting Form.pdf · Pages 1–3');
  expect(notes).toContain('Example Owner · 000 - Title Sheet.pdf, page 1, revision 1');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const screenshot = await page.screenshot({ path: info.outputPath('mobile-handoff.png'), fullPage: true });
  await info.attach('mobile handoff', { body: screenshot, contentType: 'image/png' });
});

test('flags combined drawings and preserves reference and replacement decisions through the ZIP', async ({ page }) => {
  await start(page);
  const title = await testPdf('000 - Title Sheet.pdf', [[
    'Title Sheet', 'Sheet Index', '000 Title Sheet', 'Structural', 'S101 Foundation Plan', 'General Notes',
  ]]);
  const combined = await testPdf('Full Drawing Set.pdf', [['Existing Floor Plan'], ['Roof Plan']]);
  const ambiguous = { ...combined, name: 'Drawing Report.pdf' };
  const checklist = await testPdf('Code Checklist.pdf', [['REVIEW TYPE CODE TITLE SECTION', 'CHECKLIST SUMMARY']], false);
  const unreadable = { name: 'Unreadable.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Broken test input') };
  const files = page.getByLabel('Add test PDFs');
  await files.setInputFiles([title]);
  await expect(page.getByText(/File analysis finished/)).toBeVisible();
  await step(page, /Fix & review/).click();
  await expect(page.getByText(/Sheets listed in drawing index were not found/)).toBeVisible();
  await step(page, /Add plans/).click();
  await files.setInputFiles([combined, ambiguous, checklist, unreadable]);
  await expect(page.getByText(/File analysis finished/)).toBeVisible();
  await expect(page.getByRole('article', { name: combined.name }).getByRole('combobox')).toHaveValue('plan');
  const confirmation = page.getByRole('article', { name: ambiguous.name }).getByRole('combobox');
  await expect(confirmation).toHaveValue('');
  await expect(page.getByRole('article', { name: checklist.name }).getByRole('combobox')).toHaveValue('reference');
  await step(page, /Fix & review/).click();
  await expect(page.getByText('Export one plan sheet per PDF')).toBeVisible();
  await expect(page.getByText('Indexed sheets could not be matched')).toBeVisible();
  await step(page, /Add plans/).click();
  await confirmation.selectOption('supporting');
  const bad = page.getByRole('article', { name: unreadable.name });
  await bad.getByRole('combobox').selectOption('reference');
  await bad.getByRole('button', { name: 'Omit from ZIP' }).click();

  const titleCard = page.getByRole('article', { name: title.name });
  await titleCard.getByRole('button', { name: 'Review filename' }).click();
  await titleCard.getByRole('textbox', { name: 'Proposed export name' }).fill('Title & Plan.pdf');
  await expect(titleCard.getByRole('button', { name: 'Accept name' })).toBeDisabled();
  await titleCard.getByRole('button', { name: 'Cancel', exact: true }).click();
  const [replace] = await Promise.all([page.waitForEvent('filechooser'), titleCard.getByRole('button', { name: 'Replace', exact: true }).click()]);
  await replace.setFiles(unreadable);
  await expect(page.getByRole('alert')).toContainText('The previous revision is still in the workspace.');
  await expect(titleCard).toContainText('Revision 1');
  await titleCard.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('button', { name: 'Undo remove' }).click();
  await expect(titleCard).toBeVisible();

  await step(page, /Prepare for CivCheck/).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download preparation ZIP' }).click()]);
  const output = unzipSync(await readFile((await download.path())!));
  expect(Buffer.from(output[`reference/source-pdfs/${checklist.name}`])).toEqual(checklist.buffer);
  expect(output[`upload/supporting/${checklist.name}`]).toBeUndefined();
  const manifest = JSON.parse(Buffer.from(output['reference/manifest.json']).toString());
  expect(manifest.omittedReferences).toContainEqual(expect.objectContaining({ originalName: unreadable.name }));
});

test('uses the chooser and folder inputs, replaces a PDF, and preserves bytes in the browser ZIP', async ({ page }, info) => {
  await start(page);
  const viewport = page.viewportSize()!;
  await expect(page.getByRole('heading', { name: 'Files', exact: true })).not.toBeFocused();
  await expect(page.getByLabel(/file fixes open/)).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Choose folder' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try the guided sample' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('mobile-files.png') });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: info.outputPath('desktop-files.png') });
  const [title, floor, ...rest] = await permitFixture();
  const folder = info.outputPath('test-input');
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, title.name), title.buffer);
  await writeFile(join(folder, 'ignored.txt'), 'ignore this test marker');
  const [directory] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose folder' }).click()]);
  await directory.setFiles(folder);
  await expect(page.getByText(/Skipped 1 non-PDF file/)).toBeVisible();
  await expect(page.getByRole('article', { name: title.name }).getByText('Checked')).toBeVisible();

  await step(page, /Fix & review/).click();
  await expect(page.getByText('Sheets listed in drawing index were not found in uploads')).toBeVisible();
  await step(page, /Add plans/).click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose PDF files' }).click()]);
  await chooser.setFiles([floor, ...rest]);
  const floorCard = page.getByRole('article', { name: floor.name });
  await expect(floorCard.getByText('Checked')).toBeVisible();
  const replacement = await testPdf(floor.name, [['Existing Floor Plan', 'Owner: Example Owner', 'Revision Two']]);
  const [replace] = await Promise.all([page.waitForEvent('filechooser'), floorCard.getByRole('button', { name: 'Replace', exact: true }).click()]);
  await replace.setFiles(replacement);
  await expect(page.getByText(/Replacement analyzed/)).toBeVisible();

  await step(page, /Prepare for CivCheck/).click();
  const checklist = page.getByRole('region', { name: 'CivCheck handoff checklist' });
  await expect(checklist.getByText('Appendix B', { exact: true })).toBeVisible();
  await expect(checklist.getByText('· Pages 1–2 · Tentative')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download preparation ZIP' }).click()]);
  expect(download.suggestedFilename()).toBe('HNL-preflight-test-only.zip');
  const output = unzipSync(await readFile((await download.path())!));
  const manifest = JSON.parse(Buffer.from(output['reference/manifest.json']).toString());
  expect(manifest).toMatchObject({ schemaVersion: 3, testOnly: true, submissionReady: false });
  expect(manifest.documents).toHaveLength(12);
  expect(manifest.documents.find((document: { exportName: string }) => document.exportName === floor.name)).toMatchObject({ revision: 2 });
  for (const document of manifest.documents) {
    expect(createHash('sha256').update(output[document.path]).digest('hex')).toBe(document.hash);
    for (const sourcePage of document.pages) expect(sourcePage).not.toHaveProperty('text');
  }
  expect(Buffer.from(output[`upload/plan/${floor.name}`])).toEqual(replacement.buffer);
  expect(JSON.stringify(manifest)).not.toContain('UNRELATED_SYNTHETIC_PAGE_TEXT');
  expect(manifest.findings.some((finding: { ruleId: string }) => finding.ruleId === 'sheet-index-missing-files')).toBe(false);
});

test('reports malformed, scanned, and password-protected files through the real PDF worker', async ({ page }) => {
  await start(page);
  const scan = await testPdf('A100 - Scanned Plan.pdf', [[]]);
  const data = await page.evaluateHandle(({ name, bytes }) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from(bytes)], name, { type: 'application/pdf' }));
    transfer.items.add(new File(['Not a PDF'], 'Broken.pdf', { type: 'application/pdf' }));
    return transfer;
  }, { name: scan.name, bytes: [...scan.buffer] });
  await page.locator('.drop-zone').dispatchEvent('drop', { dataTransfer: data });
  await expect(page.getByRole('article', { name: 'Broken.pdf' }).getByText('Needs attention')).toBeVisible();
  await page.getByRole('article', { name: scan.name }).getByRole('button', { name: 'View PDF' }).click();
  await expect(page.getByRole('dialog').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: /Extracted text/ }).click();
  await expect(page.getByText(/No readable text layer was detected/)).toBeVisible();
  await page.keyboard.press('Escape');
  const locked = fileURLToPath(new URL('./password-protected.test.pdf', import.meta.url));
  await page.getByLabel('Add test PDFs').setInputFiles(locked);
  await expect(page.getByRole('article', { name: 'password-protected.test.pdf' }).getByText(/Password-protected PDFs/)).toBeVisible();
});

test('measures the 12-file synthetic rehearsal in cold and warm sessions', async ({ browser }, info) => {
  test.skip(!process.env.PREFLIGHT_BENCHMARK, 'Set PREFLIGHT_BENCHMARK=1 to run the benchmark');
  test.setTimeout(240_000);
  const files = await permitFixture();
  const measurements = [];
  for (let trial = 1; trial <= 3; trial++) {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, acceptDownloads: true });
    try {
      const page = await context.newPage();
      for (const session of ['cold', 'warm']) {
        await start(page);
        const browserMetrics = await page.evaluateHandle(() => {
          const metrics = { longestTaskMs: 0, peakJsHeapBytes: 0 };
          const browserPerformance = performance as Performance & { memory?: { usedJSHeapSize: number } };
          if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) metrics.longestTaskMs = Math.max(metrics.longestTaskMs, entry.duration);
            }).observe({ type: 'longtask' });
          }
          if (browserPerformance.memory) {
            const sample = () => { metrics.peakJsHeapBytes = Math.max(metrics.peakJsHeapBytes, browserPerformance.memory!.usedJSHeapSize); };
            sample();
            window.setInterval(sample, 50);
          }
          return metrics;
        });
        const began = performance.now();
        await page.getByLabel('Add test PDFs').setInputFiles(files);
        await expect(page.getByText(/File analysis finished/)).toBeVisible({ timeout: 60_000 });
        const analysisMs = Math.round(performance.now() - began);
        const opened = performance.now();
        await page.getByRole('article', { name: files[0].name }).getByRole('button', { name: 'View PDF' }).click();
        await expect(page.getByRole('dialog').locator('canvas')).toBeVisible();
        const previewMs = Math.round(performance.now() - opened);
        await page.keyboard.press('Escape');
        await step(page, /Prepare for CivCheck/).click();
        const exporting = performance.now();
        await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download preparation ZIP' }).click()]);
        const exportMs = Math.round(performance.now() - exporting);
        measurements.push({ trial, session, analysisMs, previewMs, exportMs, ...await browserMetrics.jsonValue() });
        await page.getByRole('button', { name: 'Start a new preparation set' }).click();
        await page.getByRole('button', { name: 'Clear and start again' }).click();
      }
    } finally {
      await context.close();
    }
  }
  const fixtureHash = createHash('sha256');
  for (const file of files) fixtureHash.update(createHash('sha256').update(file.buffer).digest());
  const result = {
    browser: browser.version(), os: version(), cpu: cpus()[0]?.model, ramBytes: totalmem(),
    fileCount: files.length, bytes: files.reduce((sum, file) => sum + file.buffer.length, 0),
    fixtureHash: fixtureHash.digest('hex'), measurements,
  };
  console.log(JSON.stringify(result));
  await info.attach('preflight-benchmark', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
});
