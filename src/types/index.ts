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
