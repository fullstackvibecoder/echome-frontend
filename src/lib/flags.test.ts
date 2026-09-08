import { describe, it, expect, afterEach } from 'vitest';
import { isGmailConnectEnabled } from './flags';

const ORIGINAL = process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = ORIGINAL;
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
