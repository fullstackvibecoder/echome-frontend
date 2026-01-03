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
  createdAt: Date;
  updatedAt: Date;
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: GeneratedContent[];
  voiceScore?: number;
  qualityScore?: number;
  createdAt: Date;
  completedAt?: Date;
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
// SOCIAL INTEGRATION TYPES
// ============================================

export type SocialPlatform =
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'facebook';

export interface SocialIntegration {
  id: string;
  userId: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  status: 'connected' | 'disconnected' | 'expired';
  postsImported?: number;
  lastSynced?: Date;
  createdAt: Date;
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
// BACKGROUND TYPES
// ============================================

export type BackgroundType = 'solid' | 'gradient' | 'preset' | 'image' | 'ai';

export type PresetBackground =
  | 'dark-minimal'
  | 'light-clean'
  | 'purple-glow'
  | 'ocean-blue'
  | 'sunset-warm'
  | 'forest-green'
  | 'midnight'
  | 'rose-gold'
  | 'neon-cyber'
  | 'earth-tones';

export interface BackgroundConfig {
  type: BackgroundType;
  gradientColors?: string[];
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
  presetId?: PresetBackground;
  imageUrl?: string;
  aiPromptHint?: string;
  overlay?: {
    color: string;
    opacity: number;
  };
}

export interface BackgroundPreset {
  id: PresetBackground;
  name: string;
  colors: string[];
}

export interface CarouselGenerationRequest {
  contentId: string;
  slides: Array<{ text: string; type?: string }>;
  background?: BackgroundConfig;
  config?: {
    primaryColor?: string;
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
  };
  contentSummary?: string;
}
