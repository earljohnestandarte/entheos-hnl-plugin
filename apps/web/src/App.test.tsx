// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPdf } from './lib/pdf';
import { createCorrectedPlan, createDemoFiles } from './lib/demo';
import { buildPackage, downloadBytes } from './lib/export';
import App from './App';

vi.mock('./lib/pdf', () => ({ readPdf: vi.fn(), UnsupportedPdfError: class extends Error {} }));
vi.mock('./lib/demo', () => ({ createDemoFiles: vi.fn(), createCorrectedPlan: vi.fn() }));
vi.mock('./lib/export', () => ({ buildPackage: vi.fn(), downloadBytes: vi.fn() }));
vi.mock('./components/PdfPreview', () => ({ PdfPreview: () => null }));

const titleName = '000 - Title Sheet.pdf';
const floorName = 'A101 & Floor Plan.pdf';
const correctedName = 'A101 - Floor Plan.pdf';
const supportingName = 'Supporting Form.pdf';
const sampleNames = [titleName, floorName, supportingName];
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const pdf = (name: string) => new File(['synthetic test placeholder'], name, { type: 'application/pdf' });

// Only metadata is needed: jsdom's File need not implement arrayBuffer().
function metadata(name: string): Awaited<ReturnType<typeof readPdf>> {
  const supporting = name === supportingName;
  const portrait = name === floorName;
  return {
    hash: (name === titleName ? 'a' : supporting ? 'c' : 'b').repeat(64),
    pages: Array.from({ length: supporting ? 3 : 1 }, (_, index) => ({
      page: index + 1,
      widthInches: supporting ? 8.5 : portrait ? 24 : 36,
      heightInches: supporting ? 11 : portrait ? 36 : 24,
      rotation: 0,
      text: name === titleName ? 'Title Sheet SHEET INDEX FAR 0.25' : 'Synthetic test document',
    })),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function prepareStart(path: 'sample' | 'test' = 'sample', name = 'Integration set') {
  fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
  fireEvent.click(screen.getByRole('radio', { name: path === 'test' ? /Use my project PDFs/ : /Try the guided sample/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Continue/ }));
  fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: name } });
  fireEvent.click(screen.getByRole('checkbox'));
}

async function startWorkspace(path: 'sample' | 'test' = 'sample', name = 'Integration set') {
  prepareStart(path, name);
  fireEvent.click(screen.getByRole('button', { name: path === 'sample' ? /Start guided sample/ : /Open workspace/ }));
  await screen.findByRole('navigation', { name: 'Local preparation steps' });
}

function navigate(name: RegExp) {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Local preparation steps' })).getByRole('button', { name }));
}

function expectFiles(names = sampleNames) {
  expect(screen.getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual(names);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readPdf).mockImplementation(async (file) => metadata(file.name));
  vi.mocked(createDemoFiles).mockImplementation(async () => sampleNames.map(pdf));
  vi.mocked(createCorrectedPlan).mockImplementation(async () => pdf(correctedName));
  vi.mocked(buildPackage).mockResolvedValue(new Uint8Array([1, 2, 3]));
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});

describe('App preparation journeys', () => {
  it('completes test-PDF onboarding into an empty workspace without generating a sample', async () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Choose PDF files' })).toBeNull();
    await startWorkspace('test', '  My test exports  ');
    expect(screen.getByText('My test exports')).toBeTruthy();
    expect(screen.getByText('0 files')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose PDF files' })).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
    const navigation = within(screen.getByRole('navigation', { name: 'Local preparation steps' }));
    expect((navigation.getByRole('button', { name: /Fix & review/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((navigation.getByRole('button', { name: /Prepare for CivCheck/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(createDemoFiles).not.toHaveBeenCalled();
    expect(readPdf).not.toHaveBeenCalled();
  });

  it('loads three sample files and retains them through findings, handoff, and back navigation', async () => {
    render(<App />);
    await startWorkspace();
    expectFiles();
    expect(readPdf).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText('Guided sample checklist')).toBeTruthy();
    expect((screen.getByLabelText(`File type for ${supportingName}`) as HTMLSelectElement).value).toBe('supporting');
    navigate(/Fix & review/);
    navigate(/Prepare for CivCheck/);
    const handoff = screen.getByRole('region', { name: 'CivCheck handoff' });
    expect(within(handoff).getByText('3 source files')).toBeTruthy();
    fireEvent.click(within(handoff).getByRole('button', { name: 'Download preparation ZIP' }));
    await waitFor(() => expect(downloadBytes).toHaveBeenCalledTimes(1));
    expect(buildPackage).toHaveBeenCalledWith('Integration set', expect.arrayContaining([
      expect.objectContaining({ record: expect.objectContaining({ originalName: floorName, status: 'complete' }) }),
    ]), expect.any(Array));
    fireEvent.click(screen.getByRole('button', { name: /Back to findings/ }));
    navigate(/Add plans/);
    expectFiles();
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('opens and closes help without changing the current files or accepted filename', async () => {
    render(<App />);
    await startWorkspace();
    fireEvent.click(within(screen.getByRole('article', { name: floorName })).getByRole('button', { name: /Review filename/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept name' }));
    const names = [titleName, correctedName, supportingName];
    expectFiles(names);
    fireEvent.click(screen.getByRole('button', { name: /How it works/ }));
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close help' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expectFiles(names);
    fireEvent.click(screen.getByRole('button', { name: /How it works/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to my workspace' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expectFiles(names);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('renames setup and navigates back to files without losing sources or classifications', async () => {
    render(<App />);
    await startWorkspace();
    fireEvent.change(screen.getByLabelText(`File type for ${supportingName}`), { target: { value: 'plan' } });
    navigate(/Set up/);
    fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: '  Renamed preparation  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to files/ }));
    expect(screen.getByText('Renamed preparation')).toBeTruthy();
    expectFiles();
    navigate(/Set up/);
    expect((screen.getByLabelText('Preparation set name') as HTMLInputElement).value).toBe('Renamed preparation');
    navigate(/Add plans/);
    expectFiles();
    expect((screen.getByLabelText(`File type for ${supportingName}`) as HTMLSelectElement).value).toBe('plan');
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('keeps files until reset is confirmed, supports cancellation, and restarts with clean defaults', async () => {
    render(<App />);
    await startWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    expectFiles();
    fireEvent.click(screen.getByRole('button', { name: 'Keep working' }));
    expect(screen.queryByRole('button', { name: 'Clear and start again' })).toBeNull();
    expectFiles();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear and start again' }));
    expect(screen.queryByRole('navigation', { name: 'Local preparation steps' })).toBeNull();
    expect(screen.queryByRole('article')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
    expect((screen.getByRole('radio', { name: /Try the guided sample/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Continue/ }));
    expect((screen.getByLabelText('Preparation set name') as HTMLInputElement).value).toBe('My preparation set');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    await screen.findByRole('navigation', { name: 'Local preparation steps' });
    expectFiles();
    expect(createDemoFiles).toHaveBeenCalledTimes(2);
    expect(readPdf).toHaveBeenCalledTimes(6);
  });

  it('waits for asynchronous sample parsing before entering the workspace', async () => {
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    render(<App />);
    prepareStart();
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('navigation', { name: 'Local preparation steps' })).toBeNull();
    expect((screen.getByRole('button', { name: /Preparing sample/ }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { parsing.resolve(metadata(titleName)); });
    await screen.findByRole('navigation', { name: 'Local preparation steps' });
    expectFiles();
    expect(readPdf).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: /Get started/ })).toBeNull();
  });

  it('finishes an asynchronous sample correction without resetting navigation or the file set', async () => {
    render(<App />);
    await startWorkspace();
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    fireEvent.click(screen.getByRole('button', { name: /Use corrected sample PDF/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(4));
    expectFiles([titleName, correctedName, supportingName]);
    expect(within(screen.getByRole('article', { name: correctedName })).getByText(/Reading PDF/)).toBeTruthy();
    navigate(/Set up/);
    await act(async () => { parsing.resolve(metadata(correctedName)); });
    await waitFor(() => expect((screen.getByRole('button', { name: /Continue to files/ }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText('Preparation set name') as HTMLInputElement).value).toBe('Integration set');
    fireEvent.click(screen.getByRole('button', { name: /Continue to files/ }));
    expectFiles([titleName, correctedName, supportingName]);
    expect(within(screen.getByRole('article', { name: correctedName })).getByText(/36\.0 × 24\.0 in.*Revision 2/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use corrected sample PDF/ })).toBeNull();
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
  });

  it('ignores a late correction parse after a confirmed reset and a new workspace start', async () => {
    render(<App />);
    await startWorkspace();
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    fireEvent.click(screen.getByRole('button', { name: /Use corrected sample PDF/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(4));
    const signal = vi.mocked(readPdf).mock.calls[3][1];
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear and start again' }));
    expect(signal.aborted).toBe(true);
    await startWorkspace('test', 'Fresh workspace');
    const freshName = 'A201 - New Plan.pdf';
    fireEvent.change(screen.getByLabelText('Add project PDFs'), { target: { files: [pdf(freshName)] } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('File analysis finished'));
    await act(async () => { parsing.resolve(metadata(correctedName)); });
    expectFiles([freshName]);
    expect(screen.getByText('Fresh workspace')).toBeTruthy();
    expect(screen.queryByText(/Replacement analyzed/)).toBeNull();
    expect((screen.getByRole('button', { name: 'Choose PDF files' }) as HTMLButtonElement).disabled).toBe(false);
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(5);
  });

  it('does not duplicate sample generation or files on repeated start clicks', async () => {
    const generation = deferred<File[]>();
    vi.mocked(createDemoFiles).mockReturnValueOnce(generation.promise);
    render(<App />);
    prepareStart();
    const start = screen.getByRole('button', { name: /Start guided sample/ });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(createDemoFiles).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Preparing sample/ }));
    expect(readPdf).not.toHaveBeenCalled();
    await act(async () => { generation.resolve(sampleNames.map(pdf)); });
    await screen.findByRole('navigation', { name: 'Local preparation steps' });
    expectFiles();
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });
});
