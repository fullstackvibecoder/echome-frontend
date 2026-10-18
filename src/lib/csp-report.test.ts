import { describe, expect, it } from 'vitest';
import { classifyCspReport, parseCspReports } from './csp-report';

const DOC = 'https://www.tryechome.com/app/library';
const CHUNK = 'https://www.tryechome.com/_next/static/chunks/0abc123.js';

/** Build a legacy `application/csp-report` body like browsers send. */
function legacy(over: Record<string, string>) {
  return {
    'csp-report': {
      'document-uri': DOC,
      'effective-directive': 'connect-src',
      'violated-directive': 'connect-src',
      'blocked-uri': '',
      'source-file': CHUNK,
      ...over,
    },
  };
}

function verdict(over: Record<string, string>) {
  const [r] = parseCspReports(legacy(over));
  return classifyCspReport(r);
}

describe('parseCspReports', () => {
  it('parses the legacy report-uri format', () => {
    const [r] = parseCspReports(legacy({ 'blocked-uri': 'https://x.test/a' }));
    expect(r).toEqual({
      directive: 'connect-src',
      blocked: 'https://x.test/a',
      sourceFile: CHUNK,
      documentUri: DOC,
    });
  });

  it('parses the Reporting API array format and ignores other report types', () => {
    const out = parseCspReports([
      {
        type: 'csp-violation',
        url: DOC,
        body: { effectiveDirective: 'frame-src', blockedURL: 'https://www.facebook.com', sourceFile: CHUNK },
      },
      { type: 'deprecation', body: {} },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ directive: 'frame-src', documentUri: DOC });
  });

  it('returns nothing for junk', () => {
    expect(parseCspReports(null)).toEqual([]);
    expect(parseCspReports('x')).toEqual([]);
    expect(parseCspReports({})).toEqual([]);
    expect(parseCspReports([null, 1])).toEqual([]);
  });
});

describe('classifyCspReport: real Sentry reports', () => {
  it('3V: drops connect to *.a.run.app (extension fetch via Sentry-wrapped fetch)', () => {
    expect(verdict({ 'blocked-uri': 'https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no' }).action).toBe('drop');
  });

  it('3Z: drops connect to *.ecs.us-east-1.on.aws', () => {
    expect(verdict({ 'blocked-uri': 'https://abc.ecs.us-east-1.on.aws/x' }).action).toBe('drop');
  });

  it('4F: drops connect to static-xl.a.88cdn.com', () => {
    expect(verdict({ 'blocked-uri': 'https://static-xl.a.88cdn.com/p.js' }).action).toBe('drop');
  });

  it('40: drops the scheme-only `properties:` value', () => {
    expect(verdict({ 'blocked-uri': 'properties:' }).action).toBe('drop');
  });

  it('3Y: drops script-src eval from our own _next chunk', () => {
    expect(
      verdict({ 'effective-directive': 'script-src', 'violated-directive': 'script-src', 'blocked-uri': 'eval' }).action,
    ).toBe('drop');
  });

  it('41: forwards frame-src https://www.facebook.com', () => {
    const v = verdict({ 'effective-directive': 'frame-src', 'blocked-uri': 'https://www.facebook.com' });
    expect(v).toEqual({
      action: 'forward',
      directive: 'frame-src',
      blockedHost: 'www.facebook.com',
      documentPath: '/app/library',
    });
  });

  it('42: forwards form-action www.facebook.com', () => {
    const v = verdict({ 'effective-directive': 'form-action', 'blocked-uri': 'https://www.facebook.com/tr/' });
    expect(v.action).toBe('forward');
  });
});

describe('classifyCspReport: other noise', () => {
  it.each(['chrome-extension://abc/x.js', 'moz-extension://abc/x.js', 'safari-web-extension://abc/x.js'])(
    'drops %s',
    (blocked) => {
      expect(verdict({ 'effective-directive': 'script-src-elem', 'blocked-uri': blocked }).action).toBe('drop');
    },
  );

  it('drops `about`', () => {
    expect(verdict({ 'effective-directive': 'frame-src', 'blocked-uri': 'about' }).action).toBe('drop');
  });

  it.each(['data', 'blob'])('drops %s from a non-self or missing source', (blocked) => {
    expect(verdict({ 'blocked-uri': blocked, 'source-file': 'chrome-extension://abc/c.js' }).action).toBe('drop');
    expect(verdict({ 'blocked-uri': blocked, 'source-file': '' }).action).toBe('drop');
  });

  it('drops malformed reports', () => {
    expect(verdict({ 'blocked-uri': '' }).action).toBe('drop');
  });
});

describe('classifyCspReport: must forward', () => {
  it('forwards connect to an unknown host from our own non-Sentry chunk', () => {
    const v = verdict({
      'blocked-uri': 'https://api.new-vendor.example/v1',
      'source-file': 'https://www.tryechome.com/_next/static/chunks/app-page.js',
    });
    expect(v).toMatchObject({ action: 'forward', blockedHost: 'api.new-vendor.example' });
  });

  it('forwards data/blob triggered by our own page code', () => {
    expect(verdict({ 'blocked-uri': 'blob', 'source-file': CHUNK }).action).toBe('forward');
  });

  it('forwards eval outside script-src', () => {
    expect(verdict({ 'effective-directive': 'script-src-elem', 'blocked-uri': 'eval' }).action).toBe('forward');
  });

  it('forwards eval from a non-_next source', () => {
    expect(
      verdict({ 'effective-directive': 'script-src', 'blocked-uri': 'eval', 'source-file': 'https://www.tryechome.com/other.js' }).action,
    ).toBe('forward');
    expect(
      verdict({ 'effective-directive': 'script-src', 'blocked-uri': 'eval', 'source-file': 'https://cdn.evil.test/_next/static/a.js' }).action,
    ).toBe('forward');
  });

  it('does not treat a lookalike host as a denylisted suffix', () => {
    expect(verdict({ 'blocked-uri': 'https://evilon.aws/x' }).action).toBe('forward');
  });

  it('only applies the host denylist to connect-src', () => {
    expect(verdict({ 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://x.a.run.app/a.js' }).action).toBe('forward');
  });
});
