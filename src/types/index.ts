/**
 * EchoMe Type Definitions
 * Comprehensive types for the entire application
 */

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: 'free' | 'starter' | 'creator' | 'studio';
  onboardingStep?: 1 | 2 | 3 | 'complete';
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended user profile with social handles and branding info
 * Used for carousel customization and public profile
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  twitter_handle?: string;
  instagram_handle?: string;
  profile_image_url?: string;
  bio?: string;
  website_url?: string;
  subscription_tier: string;
  credits_remaining: number;
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  // Profile context (custom instructions)
  profile_role?: string;
  profile_topics?: string;
  profile_cta?: string;
  profile_guardrails?: string;
}

/**
 * Input for updating user profile
 */
export interface UserProfileUpdate {
  full_name?: string;
  display_name?: string;
  twitter_handle?: string | null;
  instagram_handle?: string | null;
  profile_image_url?: string | null;
  bio?: string | null;
  website_url?: string | null;
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  // Profile context (custom instructions)
  profile_role?: string | null;
  profile_topics?: string | null;
  profile_cta?: string | null;
  profile_guardrails?: string | null;
}

// ============================================
// CONTENT GENERATION TYPES
// ============================================

export type Platform =
  | 'instagram'
  | 'linkedin'
  | 'blog'
  | 'email'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'video-script';

export type InputType = 'text' | 'video' | 'audio';

export type ContentTone =
  | 'conversational'
  | 'professional'
  | 'casual'
  | 'authoritative'
  | 'humorous'
  | 'inspirational'
  | 'educational';

export interface GeneratedContent {
  id: string;
  requestId: string;
  platform: Platform;
  content: string;
  voiceScore: number; // 0-100
  qualityScore: number; // 0-100
  userFeedback?: 'good' | 'bad' | 'neutral';
  metadata?: {
    characterCount?: number;
    wordCount?: number;
    hashtags?: string[];
  };
  createdAt: Date;
}

export interface GenerationRequest {
  id: string;
  userId: string;
  inputType: InputType;
  inputText?: string;
  inputVideoPath?: string;
  inputAudioPath?: string;
  knowledgeBaseId?: string;
  platforms: Platform[];
  tone?: ContentTone;
  additionalInstructions?: string;
  useTllValidator?: boolean;
  // Carousel design options
  designPreset?: DesignPreset;
  carouselBackground?: BackgroundConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: GeneratedContent[];
  voiceScore?: number;
  qualityScore?: number;
  generatedTitle?: string; // AI-generated concise title
  createdAt: Date | string;
  completedAt?: Date | string;
  errorMessage?: string;
}

/**
 * Detailed generation request with content kit, clips, and carousel
 * Used for Content Library detail view
 */
export interface GenerationRequestDetail {
  request: GenerationRequest;
  content?: GeneratedContentItem[];
  contentKit?: ContentKitDetail;
  clips?: VideoClipDetail[];
  carousel?: GeneratedCarouselDetail;
}

export interface GeneratedContentItem {
  id: string;
  platform: string;
  content: string;
  voiceScore?: number;
  qualityScore?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ContentKitDetail {
  id: string;
  userId: string;
  videoUploadId: string;
  title: string;
  contentLinkedin?: string;
  contentTwitter?: string;
  contentInstagram?: string;
  contentBlog?: string;
  contentEmail?: string;
  contentTiktok?: string;
  contentYoutube?: string;
  contentVideoScript?: string;
  generationRequestId?: string;
  contentGenerated: boolean;
  clipsGenerated: number;
  createdAt: string;
}

export interface VideoClipDetail {
  id: string;
  videoUploadId: string;
  startTime: number;
  endTime: number;
  duration: number;
  title?: string;
  transcriptText?: string;
  viralityScore?: number;
  qualityScore?: number;
  engagementPotential?: number;
  selectionReason?: string;
  suggestedCaption?: string; // AI-generated caption for social media posting
  format: 'portrait' | 'landscape' | 'square';
  width?: number;
  height?: number;
  faceCropApplied?: boolean; // Whether GPT-4 Vision face detection was used
  faceCropCenter?: { x: number; y: number }; // Face center coordinates (0-1)
  hasCaptions?: boolean;
  thumbnailUrl?: string;
  exports: Array<{
    format: string;
    quality: string;
    url: string;
    storagePath?: string;
  }>;
  status: string;
  sortOrder?: number;
  isSelected?: boolean;
  createdAt: string;
}

export type TemplateType =
  | 'tweet-style'    // Twitter/X style card
  | 'text-box'       // Text box overlay
  | 'photo-overlay'; // Photo with text overlay

export type DesignPreset =
  | 'auto'           // Auto-select (defaults to tweet-style)
  | 'tweet-style'    // Twitter/X style card for all slides
  | 'text-box';      // Text box overlay for all slides
  // Note: 'photo-overlay' is selected automatically when user uploads an image

export interface GeneratedCarouselSlide {
  slideNumber: number;
  text: string;
  publicUrl: string;
  template: TemplateType;
  /** @deprecated Use template instead */
  slideType?: 'hook' | 'content' | 'list' | 'quote' | 'cta';
}

export interface GeneratedCarouselDetail {
  id: string;
  userId: string;
  generationRequestId?: string;
  contentId: string;
  slideCount: number;
  designPreset: DesignPreset;
  /** @deprecated Use designPreset instead */
  backgroundType?: string;
  slides: GeneratedCarouselSlide[];
  qualityScore?: number;
  createdAt: string;
}

// ============================================
// KNOWLEDGE BASE TYPES
// ============================================

export type FileType =
  | 'pdf'
  | 'video'
  | 'audio'
  | 'email'
  | 'text'
  | 'social'
  | 'other';

export interface KnowledgeBase {
  id: string;
  userId: string;
  name: string;
  status: 'active' | 'training' | 'archived';
  totalChunks: number;
  storageUsed?: number; // bytes
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedFile {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: FileType;
  fileSize: number; // bytes
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunksCreated: number;
  errorMessage?: string;
  uploadedAt: Date;
  processedAt?: Date;
}

// Alias for consistency
export type KBFile = UploadedFile;

// ============================================
// UNIFIED CONTENT TYPES
// ============================================

/**
 * Source type for unified content items
 * Identifies where the content came from
 */
export type ContentSourceType =
  | 'file_upload'      // Direct file uploads (PDF, video, audio)
  | 'paste_text'       // Pasted writing samples
  | 'paste_social'     // Pasted social posts
  | 'paste_email'      // Pasted individual emails
  | 'voice_recording'  // Voice recordings
  | 'mbox_import'      // MBOX email archive import
  | 'youtube_import'   // YouTube transcript import
  | 'instagram_import' // Instagram caption import
  | 'generation'       // AI generation request
  | 'clip-finder';     // Video clip finder upload

/**
 * Processing status for content items
 */
export type ContentProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

/**
 * Unified content item that represents any type of KB content
 */
export interface UnifiedContentItem {
  id: string;
  sourceType: ContentSourceType;
  title: string;
  description?: string;
  status: ContentProcessingStatus;
  fileSize?: number;
  fileType?: string;
  chunkCount: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Statistics for knowledge base content
 */
export interface KBContentStats {
  totalItems: number;
  totalChunks: number;
  totalSize: number;
  bySourceType: Record<string, number>;
}

/**
 * Response from the unified content endpoint
 */
export interface UnifiedContentResponse {
  items: UnifiedContentItem[];
  stats: KBContentStats;
}

/**
 * Display configuration for content source types
 */
export const CONTENT_SOURCE_CONFIG: Record<ContentSourceType, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  file_upload: {
    label: 'File',
    icon: 'file',
    color: 'blue',
    description: 'Uploaded document or media file',
  },
  paste_text: {
    label: 'Writing',
    icon: 'edit-3',
    color: 'purple',
    description: 'Pasted writing sample',
  },
  paste_social: {
    label: 'Social',
    icon: 'share-2',
    color: 'pink',
    description: 'Pasted social media post',
  },
  paste_email: {
    label: 'Email',
    icon: 'mail',
    color: 'orange',
    description: 'Pasted email content',
  },
  voice_recording: {
    label: 'Voice',
    icon: 'mic',
    color: 'green',
    description: 'Voice recording transcript',
  },
  mbox_import: {
    label: 'Email Archive',
    icon: 'inbox',
    color: 'amber',
    description: 'Imported MBOX email archive',
  },
  youtube_import: {
    label: 'YouTube',
    icon: 'youtube',
    color: 'red',
    description: 'YouTube video transcripts',
  },
  instagram_import: {
    label: 'Instagram',
    icon: 'instagram',
    color: 'fuchsia',
    description: 'Instagram post captions',
  },
  generation: {
    label: 'Generated',
    icon: 'sparkles',
    color: 'cyan',
    description: 'Agentic content',
  },
  'clip-finder': {
    label: 'Video Clip',
    icon: 'video',
    color: 'teal',
    description: 'Extracted video clip',
  },
};

// ============================================
// SOCIAL INTEGRATION TYPES
// ============================================

export type SocialPlatform =
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'facebook'
  | 'spotify'
  | 'google';

export interface SocialIntegration {
  id: string;
  userId?: string;
  user_id?: string;
  platform: SocialPlatform;
  accountName?: string;
  accountId?: string;
  platform_username?: string;
  platform_user_id?: string;
  status: 'connected' | 'disconnected' | 'expired' | 'active' | 'inactive' | 'error' | 'pending';
  postsImported?: number;
  lastSynced?: Date;
  last_sync_at?: string;
  createdAt?: Date;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================
// FORM TYPES
// ============================================

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface GenerateContentFormData {
  inputType: InputType;
  inputText?: string;
  inputFile?: File;
  platforms: Platform[];
  tone?: ContentTone;
  additionalInstructions?: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// ============================================
// IMAGE GENERATION TYPES
// ============================================

export type ImageStyle = 'professional' | 'casual' | 'creative' | 'minimalist';
export type ImageAspectRatio = '16:9' | '1:1' | '4:3';

export interface ImageGenerationOptions {
  style?: ImageStyle;
  aspectRatio?: ImageAspectRatio;
  brand?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoText?: string;
    watermark?: {
      text: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity?: number;
    };
  };
}

export interface GeneratedImage {
  url: string;
  publicUrl: string;
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  storagePath: string;
  template?: TemplateType;
  /** @deprecated Use template instead */
  slideType?: 'hook' | 'content' | 'list' | 'quote' | 'cta';
}

export interface GeneratedCarousel {
  contentId: string;
  slides: CarouselSlide[];
  createdAt: string;
}

export interface BlogHeaderRequest {
  sourceContent: string;
  blogContent?: string;
  options?: ImageGenerationOptions;
}

export interface CarouselRequest {
  contentId: string;
  slides: Array<{ text: string; type?: string }>;
  options?: ImageGenerationOptions;
}

// ============================================
// BACKGROUND / DESIGN PRESET TYPES
// ============================================

/** @deprecated Use DesignPreset instead */
export type BackgroundType = 'preset' | 'image' | 'ai';

/** @deprecated Use DesignPreset instead */
export type PresetBackground =
  | 'tweet-style'      // Maps to 'default'
  | 'simple-black'     // Maps to 'default'
  | 'simple-white';    // Maps to 'minimal'

/** @deprecated Use designPreset in CarouselGenerationRequest instead */
export interface BackgroundConfig {
  type: BackgroundType;
  presetId?: PresetBackground;
  imageUrl?: string;
  aiPromptHint?: string;
}

export interface BackgroundPreset {
  id: PresetBackground;
  name: string;
  colors: string[];
}

export interface DesignPresetConfig {
  id: DesignPreset;
  name: string;
  description: string;
  colors: { bg: string; accent: string };
}

export interface CarouselGenerationRequest {
  contentId: string;
  slides: Array<{ text: string }>;
  designPreset?: DesignPreset;
  brandColors?: {
    primary?: string;
    accent?: string;
    warmAccent?: string;
  };
  contentSummary?: string;
  /** @deprecated Use designPreset instead */
  background?: BackgroundConfig;
}

// ============================================
// UNIFIED CONTENT KIT TYPES
// ============================================

export type ContentKitType = 'video' | 'text' | 'carousel' | 'mixed';

/**
 * Unified content item that normalizes data from both
 * generation requests and clip finder uploads
 */
export interface UnifiedContentItem {
  id: string;
  type: ContentKitType;
  title: string;
  description?: string;

  // Source tracking
  sourceType: ContentSourceType;
  generationRequestId?: string;
  videoUploadId?: string;

  // Content counts
  clipCount: number;
  platformCount: number;
  carouselSlideCount: number;

  // Preview data
  thumbnailUrl?: string;
  carouselImageUrl?: string; // First carousel slide image
  previewText?: string;
  platforms: Platform[];

  // Scores
  voiceScore?: number;
  qualityScore?: number;
  viralityScore?: number;

  // Status
  status: ContentProcessingStatus;
  progressPercent?: number;
  statusMessage?: string;

  // Metadata
  createdAt: string;
  inputType: InputType;
}

export interface ContentKitStats {
  total: number;
  videos: number;
  written: number;
  carousels: number;
  processing: number;
  thisWeek: number;
  failed: number;
}

export type ContentKitFilter = 'all' | 'videos' | 'written' | 'carousels';
export type ContentKitSort = 'recent' | 'voice-score' | 'status';

// ============================================
// CONTENT SCHEDULING TYPES
// ============================================

/**
 * Content category for balanced content mix
 */
export type ContentCategory =
  | 'authority'        // Educational/expert content
  | 'personal_story'   // Personal/lifestyle content
  | 'pain_problem'     // Pain point content
  | 'testimonial';     // Case study/results content

/**
 * Status of a scheduled post
 */
export type ScheduleStatus = 'scheduled' | 'posted' | 'skipped';

/**
 * Type of content being scheduled
 */
export type ScheduledContentType = 'written' | 'clips' | 'carousel';

/**
 * Time slots for posting
 */
export type TimeSlot = 'morning' | 'lunch' | 'evening';

/**
 * Content snapshot for scheduled posts - stores actual content for quick access
 */
export interface ContentSnapshot {
  type: ScheduledContentType;
  // For written content
  text?: string;
  // For video clips
  videoUrl?: string;
  thumbnailUrl?: string;
  suggestedCaption?: string;
  // For carousels
  carouselSlides?: Array<{
    slideNumber: number;
    imageUrl: string;
    text?: string;
  }>;
}

/**
 * A scheduled post entry in the content calendar
 */
export interface ScheduledPost {
  id: string;
  contentKitId?: string;
  generatedContentId?: string;
  title?: string; // Denormalized title for display
  scheduledFor: string;
  platforms: string[];
  contentCategory?: ContentCategory;
  contentType?: ScheduledContentType;
  contentSnapshot?: ContentSnapshot;
  status: ScheduleStatus;
  postedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a scheduled post
 */
export interface ScheduledPostInput {
  contentKitId?: string;
  generatedContentId?: string;
  title?: string;
  scheduledFor: string;
  platforms: string[];
  contentCategory?: ContentCategory;
  contentType?: ScheduledContentType;
  contentSnapshot?: ContentSnapshot;
  notes?: string;
}

/**
 * Input for updating a scheduled post
 */
export interface ScheduledPostUpdate {
  scheduledFor?: string;
  platforms?: string[];
  contentCategory?: ContentCategory;
  status?: ScheduleStatus;
  notes?: string;
}

/**
 * AI-generated scheduling suggestion for content mix balance
 */
export interface ScheduleSuggestion {
  date: string;
  timeSlot: TimeSlot;
  suggestedTime: string;
  suggestedCategory: ContentCategory;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Recommendation for content category mix
 */
export interface CategoryRecommendation {
  category: ContentCategory;
  needed: number;
  message: string;
}

/**
 * Weekly analysis from the scheduling suggestions service
 */
export interface WeeklyAnalysis {
  weekStart: string;
  weekEnd: string;
  currentStats: Record<ContentCategory, number>;
  recommendations: CategoryRecommendation[];
  suggestions: ScheduleSuggestion[];
  totalScheduled: number;
  isBalanced: boolean;
}

/**
 * Content category display configuration
 */
export const CONTENT_CATEGORY_CONFIG: Record<ContentCategory, {
  label: string;
  description: string;
  color: string;
  icon: string;
}> = {
  authority: {
    label: 'Authority/Educational',
    description: 'Expert tips, how-to content, industry insights',
    color: 'blue',
    icon: 'graduation-cap',
  },
  personal_story: {
    label: 'Personal Story/Lifestyle',
    description: 'Behind the scenes, personal experiences, daily life',
    color: 'purple',
    icon: 'user',
  },
  pain_problem: {
    label: 'Pain/Problem',
    description: 'Address challenges, speak to struggles, empathize',
    color: 'orange',
    icon: 'alert-circle',
  },
  testimonial: {
    label: 'Testimonial/Case Study',
    description: 'Success stories, client results, social proof',
    color: 'green',
    icon: 'star',
  },
};

/**
 * Unscheduled content item (content kit without a scheduled post)
 */
export interface UnscheduledContent {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt: string;
}
