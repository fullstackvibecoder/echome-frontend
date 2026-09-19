import { describe, it, expect, afterEach } from 'vitest';
import { isGmailConnectEnabled, isZoomImportEnabled, ZOOM_URL_RE } from './flags';

const ORIGINAL = process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
const ORIGINAL_ZOOM = process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = ORIGINAL;
  }
  if (ORIGINAL_ZOOM === undefined) {
    delete process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED = ORIGINAL_ZOOM;
  }
});

describe('isGmailConnectEnabled', () => {
  it('is false when the variable is unset', () => {
    delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
    expect(isGmailConnectEnabled()).toBe(false);
  });

  it('is false for any value other than the string true', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = '1';
    expect(isGmailConnectEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'TRUE';
    expect(isGmailConnectEnabled()).toBe(false);
  });

  it('is true for the string true', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'true';
    expect(isGmailConnectEnabled()).toBe(true);
  });
});

describe('isZoomImportEnabled', () => {
  it('is false when the variable is unset (default hidden)', () => {
    delete process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED;
    expect(isZoomImportEnabled()).toBe(false);
  });

  it('is false for any value other than the string true', () => {
    process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED = '1';
    expect(isZoomImportEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED = 'TRUE';
    expect(isZoomImportEnabled()).toBe(false);
  });

  it('is true for the string true', () => {
    process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED = 'true';
    expect(isZoomImportEnabled()).toBe(true);
  });
});

describe('ZOOM_URL_RE', () => {
  it('matches zoom.us recording links, including regional subdomains', () => {
    expect(ZOOM_URL_RE.test('https://us06web.zoom.us/rec/share/xyz')).toBe(true);
    expect(ZOOM_URL_RE.test('https://zoom.us/rec/share/xyz')).toBe(true);
  });

  it('does not match unrelated video URLs', () => {
    expect(ZOOM_URL_RE.test('https://youtu.be/abc123')).toBe(false);
    expect(ZOOM_URL_RE.test('https://loom.com/share/abc')).toBe(false);
  });
});
