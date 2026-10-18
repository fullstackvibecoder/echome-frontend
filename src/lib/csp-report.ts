/**
 * CSP violation report parsing and noise filtering.
 *
 * Pure functions only (no Next, no Sentry) so the rules are unit-testable.
 * The route at app/api/csp-report/route.ts calls `parseCspReports` and
 * `classifyCspReport`, and forwards what survives to Sentry.
 *
 * Background: while the CSP ships report-only, the stream is dominated by
 * things we cannot or should not fix (browser extensions, bundled polyfill
 * probes). Those hide the real violations we must resolve before enforcing.
 */

/** A report normalised from either wire format. */
export interface NormalizedCspReport {
  /** Effective directive, e.g. `connect-src` (falls back to violated-directive). */
  directive: string;
  /** Raw blocked-uri / blockedURL: a URL, a bare scheme (`data`), or `eval`/`inline`. */
  blocked: string;
  sourceFile: string;
  documentUri: string;
}

export type CspVerdict =
  | { action: 'drop'; reason: string }
  | { action: 'forward'; directive: string; blockedHost: string; documentPath: string };

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function fromLegacy(r: Record<string, unknown>): NormalizedCspReport {
  const directive = str(r['effective-directive']) || str(r['violated-directive']);
  return {
    directive: directive.split(/\s+/)[0] ?? '',
    blocked: str(r['blocked-uri']),
    sourceFile: str(r['source-file']),
    documentUri: str(r['document-uri']),
  };
}

function fromReportingApi(r: Record<string, unknown>): NormalizedCspReport | null {
  if (r.type !== 'csp-violation') return null;
  const body = r.body;
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const directive = str(b.effectiveDirective) || str(b.violatedDirective);
  return {
    directive: directive.split(/\s+/)[0] ?? '',
    blocked: str(b.blockedURL),
    sourceFile: str(b.sourceFile),
    documentUri: str(b.documentURL) || str(r.url),
  };
}

/**
 * Accepts the parsed JSON body of either wire format:
 *  - `application/csp-report` (report-uri): `{ "csp-report": { ... } }`
 *  - `application/reports+json` (Reporting API): `[ { type: 'csp-violation', body: { ... } } ]`
 * Anything else yields an empty list. Capped so one POST cannot fan out.
 */
export function parseCspReports(json: unknown): NormalizedCspReport[] {
  const out: NormalizedCspReport[] = [];
  if (Array.isArray(json)) {
    for (const item of json.slice(0, 10)) {
      if (item && typeof item === 'object') {
        const n = fromReportingApi(item as Record<string, unknown>);
        if (n) out.push(n);
      }
    }
  } else if (json && typeof json === 'object') {
    const legacy = (json as Record<string, unknown>)['csp-report'];
    if (legacy && typeof legacy === 'object') {
      out.push(fromLegacy(legacy as Record<string, unknown>));
    }
  }
  return out;
}

function parseUrl(v: string): URL | null {
  try {
    return new URL(v);
  } catch {
    return null;
  }
}

const EXTENSION_SCHEMES = new Set([
  'chrome-extension:',
  'moz-extension:',
  'safari-web-extension:',
  'safari-extension:',
]);

/**
 * Connect-src hosts that only ever show up because a browser extension calls
 * fetch(). Sentry wraps window.fetch, so the browser attributes the call to
 * the Sentry SDK chunk, which means we cannot tell extension calls from our
 * own by source-file (a genuine app fetch is attributed the same way). We
 * therefore cannot use a "source is the Sentry chunk" rule and keep a small
 * explicit denylist instead. Add a host here only after confirming in Sentry
 * that it is not EchoMe code. Matches the host or any subdomain.
 *   a.run.app       ECHO-ME-FRONTEND-3V  mpc-prod-24-*.a.run.app/events
 *   on.aws          ECHO-ME-FRONTEND-3Z  *.ecs.us-east-1.on.aws
 *   88cdn.com       ECHO-ME-FRONTEND-4F  static-xl.a.88cdn.com
 */
export const EXTENSION_CONNECT_HOST_SUFFIXES = ['a.run.app', 'on.aws', '88cdn.com'];

function hostMatchesSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

/** True when `sourceFile` is a URL on the same origin as the reporting document. */
function isSameOrigin(sourceFile: string, documentUri: string): boolean {
  const s = parseUrl(sourceFile);
  const d = parseUrl(documentUri);
  return !!s && !!d && s.origin === d.origin;
}

/** True when `sourceFile` is one of our own Next.js static chunks. */
function isOwnNextChunk(sourceFile: string, documentUri: string): boolean {
  const s = parseUrl(sourceFile);
  return isSameOrigin(sourceFile, documentUri) && !!s && s.pathname.startsWith('/_next/static/');
}

/** Decide whether a report is noise (drop) or worth a Sentry event (forward). */
export function classifyCspReport(r: NormalizedCspReport): CspVerdict {
  const blocked = r.blocked.trim();
  const directive = r.directive;

  if (!directive || !blocked) return { action: 'drop', reason: 'malformed' };

  // Our own JS probing for eval/inline, e.g. the JSZip Node polyfill's
  // is-generator-function check (`Function("return function*() {}")` in a
  // try/catch, ECHO-ME-FRONTEND-3Y). Harmless under enforcement because the
  // probe is caught. Restricted to script-src and to our own /_next/static/
  // chunks so an eval from anywhere else, or in another directive, still
  // reports. Trade-off: a genuine new eval() in a bundled dependency is
  // hidden by this rule; revisit before flipping to enforcing.
  if (blocked === 'eval' || blocked === 'inline') {
    if (directive === 'script-src' && isOwnNextChunk(r.sourceFile, r.documentUri)) {
      return { action: 'drop', reason: 'bundled-probe' };
    }
    return forward(r, blocked);
  }

  // Bare schemes: Chrome reports data:/blob:/about: URIs as just the scheme.
  if (blocked === 'data' || blocked === 'blob') {
    // Only drop when the trigger is not our own page code (extensions inject
    // data:/blob: resources; source-file is empty or a foreign URL).
    return isSameOrigin(r.sourceFile, r.documentUri)
      ? forward(r, blocked)
      : { action: 'drop', reason: 'foreign-data-blob' };
  }
  if (blocked === 'about') return { action: 'drop', reason: 'about' };

  const url = parseUrl(blocked);
  if (!url) return { action: 'drop', reason: 'not-a-url' };

  if (EXTENSION_SCHEMES.has(url.protocol)) {
    return { action: 'drop', reason: 'extension-scheme' };
  }

  // Scheme-only or opaque values such as `properties:` (ECHO-ME-FRONTEND-40):
  // anything that is not http(s)/ws(s) with a host is not a resource we load.
  const networkScheme = ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
  if (!networkScheme || !url.hostname) {
    return { action: 'drop', reason: 'no-host' };
  }

  if (
    directive === 'connect-src' &&
    EXTENSION_CONNECT_HOST_SUFFIXES.some((s) => hostMatchesSuffix(url.hostname, s))
  ) {
    return { action: 'drop', reason: 'extension-connect-host' };
  }

  return forward(r, url.hostname);
}

function forward(r: NormalizedCspReport, blockedHost: string): CspVerdict {
  const doc = parseUrl(r.documentUri);
  return {
    action: 'forward',
    directive: r.directive,
    blockedHost,
    documentPath: doc ? doc.pathname : '',
  };
}
