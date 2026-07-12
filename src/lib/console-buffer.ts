export interface CapturedError {
  message: string;
  stack?: string;
  at: string;
}

const CAPACITY = 5;
const buffer: CapturedError[] = [];
let installed = false;

function push(message: string, stack?: string): void {
  buffer.push({
    message: String(message).slice(0, 500),
    stack: stack ? stack.slice(0, 1000) : undefined,
    at: new Date().toISOString(),
  });
  while (buffer.length > CAPACITY) buffer.shift();
}

/** Last N captured errors, newest last. Returns a copy. Safe anytime. */
export function getRecentErrors(): CapturedError[] {
  return [...buffer];
}

/** Wrap console.error + window error events once. Idempotent. No-op on server. */
export function installConsoleBuffer(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
    } catch {
      /* never break console */
    }
    origError(...args);
  };
  window.addEventListener('error', (e) => push(e.message, (e as ErrorEvent).error?.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason;
    push(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}

/** Test-only reset. */
export function __resetConsoleBuffer(): void {
  buffer.length = 0;
  installed = false;
}
