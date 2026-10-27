import { describe, it, expect } from 'vitest';
import { pickMostRecent, type ParsedEmail } from './mbox-parser';

const email = (id: string, date: string): ParsedEmail => ({
  messageId: id,
  from: 'me@example.com',
  to: 'client@example.com',
  subject: id,
  date,
  textContent: 'body',
  contentHash: id,
});

describe('pickMostRecent', () => {
  it('keeps the newest emails, newest first', () => {
    const emails = [
      email('old', 'Mon, 1 Jan 2024 10:00:00 +0000'),
      email('new', 'Fri, 3 Oct 2026 10:00:00 +0000'),
      email('mid', 'Wed, 1 May 2025 10:00:00 +0000'),
    ];
    expect(pickMostRecent(emails, 2).map((e) => e.messageId)).toEqual(['new', 'mid']);
  });

  it('puts undated emails last in their original order', () => {
    const emails = [email('a', ''), email('dated', '2025-01-01'), email('b', 'not a date')];
    expect(pickMostRecent(emails, 3).map((e) => e.messageId)).toEqual(['dated', 'a', 'b']);
  });

  it('returns everything when under the count', () => {
    expect(pickMostRecent([email('x', '2025-01-01')], 100)).toHaveLength(1);
  });
});
