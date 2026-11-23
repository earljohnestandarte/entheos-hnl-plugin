import { describe, expect, it, vi } from 'vitest';
import { withDeadline } from './deadline';

describe('withDeadline', () => {
  it('returns successful work and cleans up', async () => {
    const cleanup = vi.fn();
    await expect(withDeadline(new AbortController().signal, 100, async () => 42, cleanup)).resolves.toBe(42);
    expect(cleanup).toHaveBeenCalled();
  });
  it('settles on timeout even when parsing never resolves', async () => {
    const cleanup = vi.fn();
    await expect(withDeadline(new AbortController().signal, 10, () => new Promise(() => undefined), cleanup)).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(cleanup).toHaveBeenCalled();
  });
  it('settles on cancellation without waiting for the operation', async () => {
    const controller = new AbortController();
    const cleanup = vi.fn();
    const promise = withDeadline(controller.signal, 500, () => new Promise(() => undefined), cleanup);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('does not invoke work on an already canceled signal', async () => {
    const controller = new AbortController(); controller.abort();
    const operation = vi.fn(async () => 42);
    await expect(withDeadline(controller.signal, 100, operation, () => undefined)).rejects.toMatchObject({ name: 'AbortError' });
    expect(operation).not.toHaveBeenCalled();
  });
});
