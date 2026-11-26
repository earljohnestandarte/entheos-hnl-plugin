export async function withDeadline<T>(
  signal: AbortSignal,
  timeoutMs: number,
  operation: (activeSignal: AbortSignal) => Promise<T>,
  cleanup: () => void,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectStop: (reason: Error) => void = () => undefined;
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  const abort = () => {
    rejectStop(new DOMException('Canceled', 'AbortError'));
    controller.abort();
    cleanup();
  };
  signal.addEventListener('abort', abort, { once: true });
  const work = Promise.resolve().then(() => {
    if (signal.aborted) { abort(); throw new DOMException('Canceled', 'AbortError'); }
    return operation(controller.signal);
  });
  timer = setTimeout(() => {
    rejectStop(new DOMException('PDF operation exceeded its time limit.', 'TimeoutError'));
    controller.abort();
    cleanup();
  }, timeoutMs);
  try { return await Promise.race([work, stopped]); }
  finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    controller.abort();
    cleanup();
  }
}
