import { describe, it, expect } from 'vitest';
import { Linkedin, Instagram, Twitter, FileText } from 'lucide-react';
import { pickPlatform } from './draft-format';
import type { DraftProposal } from '@/types';

function makeDraft(overrides: Partial<DraftProposal>): DraftProposal {
  return {
    id: 'd1',
    title: 'A draft',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: null,
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('pickPlatform', () => {
  it('prefers LinkedIn when present', () => {
    const r = pickPlatform(makeDraft({ content_linkedin: 'x', content_instagram: 'y', content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Linkedin, label: 'LinkedIn' });
  });

  it('falls back to Instagram when no LinkedIn', () => {
    const r = pickPlatform(makeDraft({ content_instagram: 'y', content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Instagram, label: 'Instagram' });
  });

  it('falls back to X (Twitter) when only twitter', () => {
    const r = pickPlatform(makeDraft({ content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Twitter, label: 'X' });
  });

  it('returns a generic Draft fallback when no platform copy', () => {
    const r = pickPlatform(makeDraft({}));
    expect(r).toEqual({ Icon: FileText, label: 'Draft' });
  });
});
