// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { analyzeDocuments } from '@hnl/core';
import type { DocumentRecord } from '@hnl/contracts';
import { StepNavigation } from './StepNavigation';
import { FilesPanel } from './FilesPanel';
import { HandoffPanel } from './HandoffPanel';
import { FindingsPanel } from './FindingsPanel';

afterEach(cleanup);
const title: DocumentRecord = { id: 'title', revision: 1, originalName: '000 - Title Sheet.pdf', exportName: '000 - Title Sheet.pdf', kind: 'plan', bytes: 100, hash: 'a'.repeat(64), status: 'complete', pages: [{ page: 1, widthInches: 36, heightInches: 24, rotation: 0, text: 'Title Sheet SHEET INDEX FAR 0.25' }] };
const bad: DocumentRecord = { ...title, id: 'floor', originalName: 'A101 & Floor Plan.pdf', exportName: 'A101 & Floor Plan.pdf', pages: [{ ...title.pages[0], widthInches: 24, heightInches: 36 }] };

describe('preparation workspace', () => {
  it('labels steps as local and does not allow empty findings/handoff navigation', () => {
    const navigate = vi.fn();
    render(<StepNavigation current="files" hasFiles={false} fixCount={0} onNavigate={navigate} />);
    expect(screen.getByRole('navigation', { name: 'Local preparation steps' })).toBeTruthy();
    expect((screen.getByRole('button', { name: /Fix & review/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Set up/ }));
    expect(navigate).toHaveBeenCalledWith('setup');
  });
  it('updates sample milestones based on real current file data', () => {
    const callbacks = { onAdd: vi.fn(), onReplace: vi.fn(), onRename: vi.fn(), onClassify: vi.fn(), onPreview: vi.fn(), onRemove: vi.fn(), onCorrectDemo: vi.fn(), onContinue: vi.fn() };
    const items = [{ record: title, demo: true }, { record: bad, demo: true }];
    const { rerender } = render(<FilesPanel {...callbacks} items={items} summary={analyzeDocuments(items.map((item) => item.record))} busy={false} exporting={false} guided highlightedId={null} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Review filename/ })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Accept name' }));
    expect(callbacks.onRename).toHaveBeenCalledWith('floor', 'A101 - Floor Plan.pdf');
    const corrected = { ...bad, exportName: 'A101 - Floor Plan.pdf', revision: 2, pages: title.pages };
    const next = [{ record: title, demo: true }, { record: corrected, demo: true }];
    rerender(<FilesPanel {...callbacks} items={next} summary={analyzeDocuments(next.map((item) => item.record))} busy={false} exporting={false} guided highlightedId={null} />);
    expect(screen.queryByRole('button', { name: /Use corrected sample PDF/ })).toBeNull();
    expect(screen.getByLabelText('Guided sample checklist').querySelectorAll('li.is-done').length).toBe(2);
    expect(screen.getByText('Next: review manual and unassessed items')).toBeTruthy();
  });
  it('offers direct file navigation without pretending local checks are compliance', () => {
    const edit = vi.fn();
    render(<FindingsPanel items={[{ record: bad }]} summary={analyzeDocuments([bad])} onPreview={vi.fn()} onEditFile={edit} onContinue={vi.fn()} initialFilter="fix" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Fix file' })[0]);
    expect(edit).toHaveBeenCalledWith('floor');
    expect(screen.getByText(/not CivCheck approval or proof/)).toBeTruthy();
  });
  it('blocks incomplete exports and separates reference material from uploads', () => {
    const record = { ...title, status: 'analyzing' as const };
    render(<HandoffPanel items={[{ record }]} summary={analyzeDocuments([record])} busy={false} exporting={false} onExport={vi.fn()} onBack={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Download preparation ZIP' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('heading', { name: 'upload/' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'reference/' })).toBeTruthy();
    expect(screen.getByText(/Do not upload these reports/)).toBeTruthy();
  });
});
