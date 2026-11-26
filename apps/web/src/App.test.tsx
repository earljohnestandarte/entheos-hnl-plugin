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

function createWorkspace(name = 'My preparation set') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to files' }));
}

async function loadSample(name?: string) {
  createWorkspace(name);
  fireEvent.click(screen.getByRole('button', { name: 'Try the guided sample' }));
  await screen.findByText(/File analysis finished/);
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
  it('requires a project name before enabling file import or the guided sample', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;
    const navigation = within(screen.getByRole('navigation', { name: 'Local preparation steps' }));
    const addPlans = navigation.getByRole('button', { name: /Add plans/ }) as HTMLButtonElement;
    expect(input.required).toBe(true);
    expect(input.value).toBe('');
    expect(navigation.getByRole('button', { name: /Workspace setup/ }).getAttribute('aria-current')).toBe('step');
    expect(addPlans.disabled).toBe(true);
    fireEvent.click(addPlans);
    createWorkspace('   ');
    expect(screen.getByRole('alert').textContent).toBe('Enter a project name.');
    expect(screen.queryByRole('button', { name: 'Choose PDF files' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try the guided sample' })).toBeNull();
    createWorkspace('Site plan review');
    expect(screen.getByText('Site plan review')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose PDF files' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose folder' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try the guided sample' })).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
    expect(addPlans.disabled).toBe(false);
    expect((navigation.getByRole('button', { name: /Fix & review/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((navigation.getByRole('button', { name: /Prepare for CivCheck/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(createDemoFiles).not.toHaveBeenCalled();
    expect(readPdf).not.toHaveBeenCalled();
  });

  it('accepts a name before import and preserves it through handoff', async () => {
    render(<App />);
    await loadSample('  Integration set  ');
    expect(screen.getByText('Integration set')).toBeTruthy();
    expectFiles();
    expect(readPdf).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText('Guided sample checklist')).toBeTruthy();
    expect((screen.getByLabelText(`File type for ${supportingName}`) as HTMLSelectElement).value).toBe('supporting');
    const floor = within(screen.getByRole('article', { name: floorName }));
    fireEvent.click(floor.getByRole('button', { name: /Review filename/ }));
    fireEvent.click(floor.getByRole('button', { name: 'Accept name' }));
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
    expectFiles([titleName, correctedName, supportingName]);
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('opens and closes help without changing the current files or accepted filename', async () => {
    render(<App />);
    await loadSample();
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
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expectFiles(names);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('rejects case-insensitive filename conflicts in the editor', async () => {
    render(<App />);
    await loadSample();
    const floor = within(screen.getByRole('article', { name: floorName }));
    fireEvent.click(floor.getByRole('button', { name: /Review filename/ }));
    fireEvent.change(floor.getByRole('textbox', { name: 'Proposed export name' }), {
      target: { value: titleName.toUpperCase().replace('.PDF', '.pdf') },
    });
    expect((floor.getByRole('button', { name: 'Accept name' }) as HTMLButtonElement).disabled).toBe(true);
    expect(floor.getByText(/Another file already uses this export name/)).toBeTruthy();
  });

  it('renames the set without losing sources or classifications', async () => {
    render(<App />);
    await loadSample();
    fireEvent.change(screen.getByLabelText(`File type for ${supportingName}`), { target: { value: 'plan' } });
    navigate(/Workspace setup/);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '  Renamed preparation  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(screen.getByText('Renamed preparation')).toBeTruthy();
    expectFiles();
    navigate(/Workspace setup/);
    expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('Renamed preparation');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expectFiles();
    expect((screen.getByLabelText(`File type for ${supportingName}`) as HTMLSelectElement).value).toBe('plan');
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });

  it('keeps files until reset is confirmed, supports cancellation, and restarts with clean defaults', async () => {
    render(<App />);
    await loadSample();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    expectFiles();
    fireEvent.click(screen.getByRole('button', { name: 'Keep working' }));
    expect(screen.queryByRole('button', { name: 'Clear and start again' })).toBeNull();
    expectFiles();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear and start again' }));
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose PDF files' })).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe('');
    await loadSample();
    expectFiles();
    expect(createDemoFiles).toHaveBeenCalledTimes(2);
    expect(readPdf).toHaveBeenCalledTimes(6);
  });

  it('shows the sample files as they parse without leaving the workspace', async () => {
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    render(<App />);
    createWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /Try the guided sample/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('navigation', { name: 'Local preparation steps' })).toBeTruthy();
    expect(screen.getAllByText('Processing')).toHaveLength(3);
    expect((screen.getByRole('button', { name: 'Choose PDF files' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { parsing.resolve(metadata(titleName)); });
    await screen.findByText(/File analysis finished/);
    expectFiles();
    expect(readPdf).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: /Try the guided sample/ })).toBeNull();
  });

  it('finishes an asynchronous sample correction without resetting navigation or the file set', async () => {
    render(<App />);
    await loadSample();
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    fireEvent.click(screen.getByRole('button', { name: /Use corrected sample PDF/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(4));
    expectFiles();
    expect(within(screen.getByRole('article', { name: floorName })).getByText(/Checking replacement/)).toBeTruthy();
    navigate(/Workspace setup/);
    await act(async () => { parsing.resolve(metadata(correctedName)); });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save name' }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('My preparation set');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expectFiles([titleName, correctedName, supportingName]);
    expect(within(screen.getByRole('article', { name: correctedName })).getByText(/36\.0 × 24\.0 in.*Revision 2/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use corrected sample PDF/ })).toBeNull();
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
  });

  it('ignores a late correction parse after a confirmed reset and a new workspace start', async () => {
    render(<App />);
    await loadSample();
    const parsing = deferred<Awaited<ReturnType<typeof readPdf>>>();
    vi.mocked(readPdf).mockReturnValueOnce(parsing.promise);
    fireEvent.click(screen.getByRole('button', { name: /Use corrected sample PDF/ }));
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(4));
    const signal = vi.mocked(readPdf).mock.calls[3][1];
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear and start again' }));
    expect(signal.aborted).toBe(true);
    createWorkspace('Fresh workspace');
    const freshName = 'A201 - New Plan.pdf';
    fireEvent.change(screen.getByLabelText('Add test PDFs'), { target: { files: [pdf(freshName)] } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('File analysis finished'));
    await act(async () => { parsing.resolve(metadata(correctedName)); });
    expectFiles([freshName]);
    expect(screen.getByText('Fresh workspace')).toBeTruthy();
    expect(screen.queryByText(/Replacement analyzed/)).toBeNull();
    expect((screen.getByRole('button', { name: 'Choose PDF files' }) as HTMLButtonElement).disabled).toBe(false);
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(5);
  });

  it('validates empty project names consistently, clears stale reset notices, and opens coverage help from setup', async () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Continue to files' }));
    expect(screen.getByRole('alert').textContent).toBe('Enter a project name.');
    expect(document.activeElement).toBe(input);

    const coverageButton = screen.getByRole('button', { name: 'Review check coverage' });
    fireEvent.click(coverageButton);
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close help' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await loadSample('First set');
    fireEvent.click(screen.getByRole('button', { name: 'Start a new preparation set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear and start again' }));
    expect(screen.getByRole('status').textContent).toContain('Session cleared');
    createWorkspace('Second set');
    expect(screen.queryByText(/Session cleared/)).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Local preparation steps' })).getByRole('button', { name: /Workspace setup/ }).className).toContain('is-done');
  });

  it('allows fixing filenames inline, verifying files, and resolving manual reviews in Fix & review', async () => {
    render(<App />);
    await loadSample('Validation test set');

    const floorCard = within(screen.getByRole('article', { name: floorName }));
    fireEvent.click(floorCard.getByRole('button', { name: 'Verify checks' }));
    expect(floorCard.getByText('File check validator')).toBeTruthy();
    expect(floorCard.getByText(/Page 1 is 24\.0 × 36\.0 in/)).toBeTruthy();

    navigate(/Fix & review/);
    const fixCard = within(screen.getByText('Use a safe PDF export filename').closest('article')!);
    fireEvent.click(fixCard.getByRole('button', { name: 'Edit & validate filename' }));
    fireEvent.click(fixCard.getByRole('button', { name: 'Accept name' }));
    const findingsRegion = within(screen.getByRole('region', { name: 'Preparation findings' }));
    const resolvedCard = within(findingsRegion.getByText('Use a safe PDF export filename').closest('article')!);
    expect(resolvedCard.getByText('Fixed')).toBeTruthy();
    expect(findingsRegion.getByText(/1 open · 1 fixed/)).toBeTruthy();

    const reviewButtons = screen.getAllByRole('button', { name: 'Mark verified' });
    const initialCount = reviewButtons.length;
    fireEvent.click(reviewButtons[0]);
    expect(screen.getAllByRole('button', { name: 'Mark verified' })).toHaveLength(initialCount - 1);
    expect(screen.getByRole('button', { name: 'Reopen review' })).toBeTruthy();
    expect(findingsRegion.getByText(/1 verified/)).toBeTruthy();

    for (const button of screen.getAllByRole('button', { name: 'Mark verified' })) {
      fireEvent.click(button);
    }
    expect(findingsRegion.getByRole('region', { name: 'Verified' })).toBeTruthy();
    expect(findingsRegion.getByRole('button', { name: /Verified \(/ })).toBeTruthy();

    navigate(/Prepare for CivCheck/);
    const handoffRegion = within(screen.getByRole('region', { name: 'CivCheck handoff' }));
    expect(handoffRegion.getByText(/1 fixed/)).toBeTruthy();
    expect(handoffRegion.getByText(new RegExp(`${initialCount} verified`))).toBeTruthy();
  });

  it('does not duplicate sample generation or files on repeated start clicks', async () => {
    const generation = deferred<File[]>();
    vi.mocked(createDemoFiles).mockReturnValueOnce(generation.promise);
    render(<App />);
    createWorkspace();
    const start = screen.getByRole('button', { name: /Try the guided sample/ });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(createDemoFiles).toHaveBeenCalledTimes(1));
    expect((start as HTMLButtonElement).disabled).toBe(true);
    expect(readPdf).not.toHaveBeenCalled();
    await act(async () => { generation.resolve(sampleNames.map(pdf)); });
    await screen.findByText(/File analysis finished/);
    expectFiles();
    expect(createDemoFiles).toHaveBeenCalledTimes(1);
    expect(readPdf).toHaveBeenCalledTimes(3);
  });
});
