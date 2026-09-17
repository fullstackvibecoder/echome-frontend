import { describe, it, expect } from 'vitest';
import { buildCspDirectives, originOf, extraOriginsFrom } from './csp';

describe('originOf', () => {
  it('returns the origin for a valid URL', () => {
    expect(originOf('https://api.example.com/v1/path?x=1')).toBe('https://api.example.com');
  });

  it('returns undefined for unset or invalid input', () => {
    expect(originOf(undefined)).toBeUndefined();
    expect(originOf('')).toBeUndefined();
    expect(originOf('not a url')).toBeUndefined();
  });
});

describe('extraOriginsFrom', () => {
  it('parses a comma-separated list into distinct origins', () => {
    expect(
      extraOriginsFrom('https://a.example.com/foo, https://b.example.com/bar'),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('drops invalid entries and returns [] for unset input', () => {
    expect(extraOriginsFrom('not a url, https://ok.example.com')).toEqual([
      'https://ok.example.com',
    ]);
    expect(extraOriginsFrom(undefined)).toEqual([]);
    expect(extraOriginsFrom('')).toEqual([]);
  });
});

describe('buildCspDirectives', () => {
  it('derives connect-src from NEXT_PUBLIC_API_URL, not a hard-coded host', () => {
    const { directives, apiOrigin } = buildCspDirectives({
      NEXT_PUBLIC_API_URL: 'https://echome-backend-production.up.railway.app/api',
    });
    expect(apiOrigin).toBe('https://echome-backend-production.up.railway.app');
    const connectSrc = directives.find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://echome-backend-production.up.railway.app');
  });

  it('falls back to the default API origin when NEXT_PUBLIC_API_URL is unset', () => {
    const { directives, apiOrigin } = buildCspDirectives({});
    expect(apiOrigin).toBe('https://api.tryechome.com');
    const connectSrc = directives.find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://api.tryechome.com');
  });

  it('folds NEXT_PUBLIC_CSP_EXTRA_CONNECT_ORIGINS into connect-src', () => {
    const { directives, extraConnectOrigins } = buildCspDirectives({
      NEXT_PUBLIC_API_URL: 'https://api.tryechome.com/api',
      NEXT_PUBLIC_CSP_EXTRA_CONNECT_ORIGINS: 'https://media.tryechome.com/status',
    });
    expect(extraConnectOrigins).toEqual(['https://media.tryechome.com']);
    const connectSrc = directives.find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://media.tryechome.com');
  });

  it('never hard-codes a per-deploy Cloud Run or ECS hostname', () => {
    const { directives } = buildCspDirectives({
      NEXT_PUBLIC_API_URL: 'https://api.tryechome.com/api',
    });
    const joined = directives.join('; ');
    expect(joined).not.toMatch(/\.a\.run\.app/);
    expect(joined).not.toMatch(/\.on\.aws/);
  });

  it('allows the Meta pixel fallback beacon in frame-src and form-action', () => {
    const { directives } = buildCspDirectives({});
    const frameSrc = directives.find((d) => d.startsWith('frame-src'));
    const formAction = directives.find((d) => d.startsWith('form-action'));
    expect(frameSrc).toContain('https://www.facebook.com');
    expect(formAction).toContain('https://www.facebook.com');
  });

  it('does not add unsafe-eval to script-src', () => {
    const { directives } = buildCspDirectives({});
    const scriptSrc = directives.find((d) => d.startsWith('script-src'));
    expect(scriptSrc).not.toContain('unsafe-eval');
  });
});
