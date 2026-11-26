// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Onboarding } from './Onboarding';

afterEach(cleanup);

function mount(onStart = vi.fn<() => Promise<void>>(async () => undefined)) {
  render(<Onboarding initialName="My preparation set" busy={false} error="" onStart={onStart} />);
  return onStart;
}

describe('onboarding', () => {
  it('offers both starting points on the first screen and explains the test session', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Try the guided sample' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload a test plan set' })).toBeTruthy();
    expect(screen.getByText(/normal CAD workflow/)).toBeTruthy();
    expect(screen.getByText(/refreshing clears the set/)).toBeTruthy();
  });

  it('requires acknowledgment and focuses the checkbox if it is missing', () => {
    const start = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload a test plan set' }));
    expect(screen.getByRole('alert').textContent).toContain('Confirm the test-only session');
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
    expect(start).not.toHaveBeenCalled();
  });

  it('starts the chosen workflow using the default when the optional name is empty', () => {
    const start = mount();
    fireEvent.change(screen.getByLabelText(/Preparation set name/), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Upload a test plan set' }));
    expect(start).toHaveBeenCalledExactlyOnceWith({ name: 'My preparation set', path: 'test' });
  });

  it('trims the name and prevents repeated starts while the sample is loading', () => {
    const start = vi.fn(() => new Promise<void>(() => undefined));
    mount(start);
    fireEvent.change(screen.getByLabelText(/Preparation set name/), { target: { value: '  Test plans  ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Try the guided sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload a test plan set' }));
    expect(start).toHaveBeenCalledExactlyOnceWith({ name: 'Test plans', path: 'sample' });
  });
});
