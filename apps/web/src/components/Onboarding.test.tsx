// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Onboarding } from './Onboarding';

afterEach(cleanup);
function mount(onStart = vi.fn<() => Promise<void>>(async () => undefined)) {
  render(<Onboarding initialName="My preparation set" busy={false} error="" onStart={onStart} />);
  return onStart;
}
function nextToSetup() {
  fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
}

describe('onboarding', () => {
  it('explains the limits before showing file controls', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'What this check covers' })).toBeTruthy();
    expect(screen.getByText(/never uploaded to a server/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose PDF files' })).toBeNull();
  });
  it('starts the guided sample with a trimmed name and acknowledged limits', async () => {
    const start = mount(); nextToSetup();
    fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: '  Demo set  ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    expect(start).toHaveBeenCalledExactlyOnceWith({ name: 'Demo set', path: 'sample' });
  });
  it('requires a name and acknowledgment', () => {
    const start = mount(); nextToSetup();
    fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    expect(screen.getByRole('alert').textContent).toContain('Give your preparation set a name');
    fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    expect(screen.getByRole('alert').textContent).toContain('Confirm the local session');
    expect(start).not.toHaveBeenCalled();
  });
  it('retains name, path, and acknowledgment when going back', () => {
    const start = mount();
    fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Use my project PDFs/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.change(screen.getByLabelText('Preparation set name'), { target: { value: 'My exports' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByRole('radio', { name: /Use my project PDFs/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect((screen.getByLabelText('Preparation set name') as HTMLInputElement).value).toBe('My exports');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Open workspace/ }));
    expect(start).toHaveBeenCalledWith({ name: 'My exports', path: 'test' });
  });
  it('prevents repeated start clicks while asynchronous setup is pending', () => {
    const start = vi.fn(() => new Promise<void>(() => undefined)); mount(start); nextToSetup();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start guided sample/ }));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
