/**
 * Reels Components
 *
 * Components for the BeatSync Reel Maker feature.
 */

// Core components
export { TemplateCard } from './TemplateCard';
export { ReelProjectCard } from './ReelProjectCard';
export { TemplatePicker } from './TemplatePicker';
export { MusicPicker } from './MusicPicker';
export { SegmentTimeline } from './SegmentTimeline';
export { RenderProgress } from './RenderProgress';

// Legacy segment-based uploader
export { ClipUploader } from './ClipUploader';

// New universal media uploader (redesign)
export { MediaUploader, type MediaItem } from './MediaUploader';
export { MediaPool } from './MediaPool';

// Template-specific arrangers (redesign)
export { BeatSyncArranger } from './BeatSyncArranger';
export { BeforeAfterArranger } from './BeforeAfterArranger';
export { HookArranger } from './HookArranger';
export { SequenceArranger, type SequenceSection } from './SequenceArranger';
