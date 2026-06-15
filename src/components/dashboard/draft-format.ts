import { Linkedin, Instagram, Twitter, FileText, type LucideIcon } from 'lucide-react';
import type { DraftProposal } from '@/types';

export interface DraftPlatform {
  Icon: LucideIcon;
  label: string;
}

// Drafts carry no format/kit field, only per-platform copy. Derive the glyph
// and meta label from the primary populated platform, using the same priority
// as pickPreview in DraftCard (LinkedIn first: longest, most-shareable copy).
export function pickPlatform(draft: DraftProposal): DraftPlatform {
  if (draft.content_linkedin) return { Icon: Linkedin, label: 'LinkedIn' };
  if (draft.content_instagram) return { Icon: Instagram, label: 'Instagram' };
  if (draft.content_twitter) return { Icon: Twitter, label: 'X' };
  return { Icon: FileText, label: 'Draft' };
}
