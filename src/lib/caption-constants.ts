/**
 * Shared caption style constants — used by both generation form (pre-gen picker)
 * and clip detail page (post-gen style switcher).
 */

export type CaptionStyleOption = 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight' | 'karaoke' | 'underline' | 'word_by_word';

export interface CaptionStyleGridItem {
  value: string;
  label: string;
  thumbnail: string;
  badge?: string;
}

export const CAPTION_STYLE_GRID: CaptionStyleGridItem[] = [
  { value: 'highlight', label: 'Color Pop', thumbnail: '/style-previews/captions/color-pop.svg', badge: 'Popular' },
  { value: 'karaoke', label: 'Karaoke', thumbnail: '/style-previews/captions/karaoke.svg' },
  { value: 'modern', label: 'Modern', thumbnail: '/style-previews/captions/modern.svg' },
  { value: 'bold', label: 'Big & Bold', thumbnail: '/style-previews/captions/big-bold.svg' },
  { value: 'underline', label: 'Underline', thumbnail: '/style-previews/captions/underline.svg' },
  { value: 'word_by_word', label: 'One at a Time', thumbnail: '/style-previews/captions/one-at-a-time.svg' },
  { value: 'classic', label: 'Subtitle Bar', thumbnail: '/style-previews/captions/subtitle-bar.svg' },
  { value: 'minimal', label: 'Clean & Simple', thumbnail: '/style-previews/captions/clean-simple.svg' },
];

export const CAPTION_STYLE_LABELS: Record<string, string> = Object.fromEntries(
  CAPTION_STYLE_GRID.map((s) => [s.value, s.label])
);
