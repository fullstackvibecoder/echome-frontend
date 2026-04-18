/**
 * API Client
 * Axios-based client for backend communication
 */

import axios, { AxiosInstance } from 'axios';
import { supabase } from './supabase';
import type {
  ApiResponse,
  GenerationRequest,
  GenerationRequestDetail,
  KnowledgeBase,
  SocialIntegration,
  GeneratedImage,
  GeneratedCarousel,
  ImageGenerationOptions,
  BackgroundConfig,
  BackgroundPreset,
  UnifiedContentResponse,
  UserProfile,
  UserProfileUpdate,
  // Reel maker types
  ReelTemplate,
  TemplateSegment,
  MusicTrack,
  MusicTrackSummary,
  ReelProject,
  ReelProjectClip,
  ReelProjectDetail,
  ReelRenderStatus,
  ReelStatus,
  CreateReelProjectInput,
  UpdateReelProjectInput,
  UpdateReelClipInput,
} from '../types';

// Re-export reel types for convenience
export type { ReelTemplate, MusicTrackSummary, MusicTrack, TemplateSegment };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance with default timeout
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds default for simple operations
});

// Extended timeouts for long-running operations
const GENERATION_TIMEOUT = 180000; // 3 minutes for AI generation (includes potential transcript extraction)
const TRANSCRIPTION_TIMEOUT = 180000; // 3 minutes for transcript extraction (download + Whisper)
const LIST_TIMEOUT = 10000; // 10 seconds for list/query operations
const DELETE_TIMEOUT = 60000; // 60 seconds for cascade deletions (can be slow with storage cleanup)
const FOLLOW_TIMEOUT = 60000; // 60 seconds for follow (channel resolution + initial poll)
const EXPORT_TIMEOUT = 120000; // 2 minutes for clip export (FFmpeg burns captions on-demand)

// Check if a JWT is expired or expiring within the next 60 seconds
function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true; // If we can't decode it, treat as expired
  }
}

// Request interceptor - add JWT token (with proactive refresh)
apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('authToken');

    // If token is expired or about to expire, try to refresh from Supabase
    if (token && isTokenExpiringSoon(token)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          // Verify the refreshed session belongs to the same user
          const currentPayload = JSON.parse(atob(token.split('.')[1]));
          const newPayload = JSON.parse(atob(session.access_token.split('.')[1]));
          if (currentPayload.sub === newPayload.sub) {
            localStorage.setItem('authToken', session.access_token);
            token = session.access_token;
          }
          // If different user, skip - proceed with existing token
        }
      } catch {
        // If refresh fails, proceed with existing token - 401 interceptor will handle it
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - show toast then redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        // Store current path so user can return after login
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/auth/login' && currentPath !== '/auth/signup') {
          localStorage.setItem('redirectAfterLogin', currentPath);
        }

        // Lazy-import toast to avoid circular deps
        import('sonner').then(({ toast }) => {
          toast.error('Session expired', {
            description: 'Please log in again.',
            duration: 3000,
          });
        });

        // Small delay so the toast is visible before redirect
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 1500);
      }
    }

    // Handle 402 Payment Required - subscription needed for this feature
    if (error.response?.status === 402 && typeof window !== 'undefined') {
      import('sonner').then(({ toast }) => {
        toast.error('Subscription required', {
          description: 'This feature requires a paid plan.',
          action: {
            label: 'View Plans',
            onClick: () => { window.location.href = '/app/billing'; },
          },
          duration: 6000,
        });
      });
    }

    // Handle 403 Forbidden - quota/subscription limit reached
    if (error.response?.status === 403) {
      const message = error.response?.data?.error || error.response?.data?.message || '';
      const isQuotaError = /free generation|generation limit|subscribe|upgrade/i.test(message);
      if (isQuotaError && typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error('Free generations used', {
            description: 'Subscribe to unlock unlimited content creation.',
            action: {
              label: 'View Plans',
              onClick: () => { window.location.href = '/app/billing'; },
            },
            duration: 6000,
          });
        });
      }
    }

    // Handle network errors and server errors — report to Sentry
    if (!error.response) {
      console.error('Network error:', error.message);
    }

    // Report 5xx and network errors to Sentry (not 4xx which are expected)
    const status = error.response?.status;
    if (!status || status >= 500) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          extra: {
            url: error.config?.url,
            method: error.config?.method,
            status,
            context: 'api_client',
          },
        });
      }).catch(() => {}); // Sentry import failure should never break the app
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTO-REFRESH: Keep localStorage token in sync with Supabase
// ============================================
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('authToken');
      return;
    }

    if (session?.access_token) {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Guard against silent session swaps: if the user is already logged in
        // with a valid (non-expired) token, don't let a different Supabase session
        // (e.g., Chrome's Google account) overwrite their token.
        const currentToken = localStorage.getItem('authToken');
        if (currentToken) {
          try {
            const currentPayload = JSON.parse(atob(currentToken.split('.')[1]));
            const newPayload = JSON.parse(atob(session.access_token.split('.')[1]));
            const nowSec = Math.floor(Date.now() / 1000);
            const currentExpired = currentPayload.exp && currentPayload.exp < nowSec;
            if (currentPayload.sub !== newPayload.sub) {
              if (currentExpired) {
                // Current token is expired - accept the new session
                console.info(`[auth] Accepting new session (previous token expired)`, {
                  expired: currentPayload.email,
                  incoming: newPayload.email,
                });
              } else if (event === 'SIGNED_IN') {
                // Explicit sign-in action - user intentionally switching accounts
                console.info(`[auth] Accepting explicit sign-in for different user`, {
                  previous: currentPayload.email,
                  incoming: newPayload.email,
                });
              } else {
                // TOKEN_REFRESHED for a different user while current is still valid - block it
                console.warn(`[auth] Blocked ${event} session swap to different user`, {
                  current: currentPayload.email,
                  incoming: newPayload.email,
                });
                return;
              }
            }
          } catch {
            // If JWT decode fails, accept the new token as fallback
          }
        }
        localStorage.setItem('authToken', session.access_token);
      } else if (event === 'INITIAL_SESSION') {
        // Initial page load - only set if no token exists yet
        if (!localStorage.getItem('authToken')) {
          localStorage.setItem('authToken', session.access_token);
        }
      }
    }
  });
}

// ============================================
// TRANSFORM HELPERS
// ============================================

/** Transform a raw snake_case team voice row from the API into camelCase TeamVoice */
function transformTeamVoice(raw: Record<string, unknown>): TeamVoice {
  return {
    id: raw.id as string,
    userId: (raw.user_id ?? raw.userId) as string,
    name: raw.name as string,
    description: (raw.description as string) || undefined,
    avatarUrl: ((raw.avatar_url ?? raw.avatarUrl) as string) || undefined,
    knowledgeBaseId: ((raw.knowledge_base_id ?? raw.knowledgeBaseId) as string) || undefined,
    profileRole: ((raw.profile_role ?? raw.profileRole) as string) || undefined,
    profileTopics: ((raw.profile_topics ?? raw.profileTopics) as string) || undefined,
    profileCta: ((raw.profile_cta ?? raw.profileCta) as string) || undefined,
    profileGuardrails: ((raw.profile_guardrails ?? raw.profileGuardrails) as string) || undefined,
    displayName: ((raw.display_name ?? raw.displayName) as string) || undefined,
    twitterHandle: ((raw.twitter_handle ?? raw.twitterHandle) as string) || undefined,
    instagramHandle: ((raw.instagram_handle ?? raw.instagramHandle) as string) || undefined,
    websiteUrl: ((raw.website_url ?? raw.websiteUrl) as string) || undefined,
    isDefault: (raw.is_default ?? raw.isDefault) as boolean,
    sortOrder: (raw.sort_order ?? raw.sortOrder) as number,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string,
  };
}

// ============================================
// API FUNCTIONS
// ============================================

export const api = {
  // -------- AUTH --------
  auth: {
    signup: async (email: string, password: string, name: string, turnstileToken?: string) => {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        name,
        turnstileToken,
      });
      return response.data;
    },

    login: async (email: string, password: string) => {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    },

    logout: () => {
      localStorage.removeItem('authToken');
      // Clear Supabase's internal session so it doesn't resurrect on next load
      supabase.auth.signOut().catch(() => {});
    },

    getCurrentUser: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },

    // Extended profile methods (stored in users table)
    getProfile: async (): Promise<ApiResponse<UserProfile>> => {
      const response = await apiClient.get('/auth/profile/extended');
      return response.data;
    },

    updateProfile: async (data: UserProfileUpdate): Promise<ApiResponse<UserProfile>> => {
      const response = await apiClient.patch('/auth/profile/extended', data);
      return response.data;
    },

    uploadProfileImage: async (file: File): Promise<ApiResponse<{ profile_image_url: string }>> => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/auth/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  },

  // -------- ACCOUNT MANAGEMENT --------
  account: {
    getDataSummary: async (): Promise<ApiResponse<{
      knowledgeBaseItems: number;
      generatedContent: number;
      files: number;
      hasSubscription: boolean;
      subscriptionTier: string | null;
    }>> => {
      const response = await apiClient.get('/account/data-summary');
      return response.data;
    },

    submitFeedback: async (data: {
      reason: string;
      details?: string;
      userType: 'free' | 'paid';
      subscriptionTier?: string;
    }): Promise<ApiResponse<{
      feedbackId: string;
      offeredCoupon: string | null;
      couponDescription: string | null;
    }>> => {
      const response = await apiClient.post('/account/cancel-feedback', data);
      return response.data;
    },

    applyWinback: async (feedbackId: string): Promise<ApiResponse<{ applied: boolean }>> => {
      const response = await apiClient.post('/account/apply-winback', { feedbackId });
      return response.data;
    },

    cancelSubscription: async (feedbackId?: string): Promise<ApiResponse<{ cancelAtPeriodEnd: string | null }>> => {
      const response = await apiClient.post('/account/cancel-subscription', { feedbackId });
      return response.data;
    },

    deleteAccount: async (feedbackId?: string): Promise<ApiResponse<{
      stripeCancel: boolean;
      stripeCustomerDeleted: boolean;
      pineconeDeleted: boolean;
      storageDeleted: boolean;
      authDeleted: boolean;
    }>> => {
      const response = await apiClient.post('/account/delete', {
        confirmation: 'DELETE',
        feedbackId,
      }, { timeout: DELETE_TIMEOUT });
      return response.data;
    },
  },

  // -------- API KEYS --------
  apiKeys: {
    list: async (): Promise<ApiResponse<any[]>> => {
      const response = await apiClient.get('/account/api-keys');
      return response.data;
    },

    create: async (data: { name: string; scopes?: string[] }): Promise<ApiResponse<any>> => {
      const response = await apiClient.post('/account/api-keys', data);
      return response.data;
    },

    revoke: async (keyId: string): Promise<ApiResponse<{ message: string }>> => {
      const response = await apiClient.delete(`/account/api-keys/${keyId}`);
      return response.data;
    },

    getUsage: async (keyId: string, days?: number): Promise<ApiResponse<any>> => {
      const response = await apiClient.get(`/account/api-keys/${keyId}/usage`, { params: { days } });
      return response.data;
    },
  },

  // -------- API CREDITS --------
  apiCredits: {
    getBalance: async (): Promise<ApiResponse<{
      balance: number;
      lifetime_purchased: number;
      lifetime_used: number;
      auto_reload: {
        enabled: boolean;
        threshold: number | null;
        pack_id: string | null;
        has_payment_method: boolean;
      };
    }>> => {
      const response = await apiClient.get('/account/api-credits');
      return response.data;
    },

    getTransactions: async (params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<any[]>> => {
      const response = await apiClient.get('/account/api-credits/transactions', { params });
      return response.data;
    },

    getPacks: async (): Promise<ApiResponse<Array<{
      id: string;
      name: string;
      credits: number;
      price: number;
      priceInCents: number;
    }>>> => {
      const response = await apiClient.get('/account/api-credits/packs');
      return response.data;
    },

    checkout: async (data: { packId: string; successUrl: string; cancelUrl: string }): Promise<ApiResponse<{ sessionId: string; url: string }>> => {
      const response = await apiClient.post('/account/api-credits/checkout', data);
      return response.data;
    },

    updateAutoReload: async (config: {
      enabled: boolean;
      threshold?: number;
      packId?: string;
      stripePaymentMethodId?: string;
    }): Promise<ApiResponse<{ message: string }>> => {
      const response = await apiClient.post('/account/api-credits/auto-reload', config);
      return response.data;
    },

    getPaymentMethods: async (): Promise<ApiResponse<Array<{
      id: string;
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    }>>> => {
      const response = await apiClient.get('/account/api-credits/payment-methods');
      return response.data;
    },

    setupPaymentMethod: async (data: { returnUrl: string }): Promise<ApiResponse<{ url: string }>> => {
      const response = await apiClient.post('/account/api-credits/setup-payment-method', data);
      return response.data;
    },
  },

  // -------- CONTENT GENERATION --------
  generation: {
    generate: async (data: Partial<GenerationRequest>) => {
      // Transform camelCase to snake_case for API
      const payload: Record<string, unknown> = {
        input_type: data.inputType,
        input_text: data.inputText,
        input_audio_path: data.inputAudioPath,
        input_video_path: data.inputVideoPath,
        knowledge_base_id: data.knowledgeBaseId,
        platforms: data.platforms,
        tone: data.tone,
        additional_instructions: data.additionalInstructions,
        use_tll_validator: data.useTllValidator,
        voice_id: data.voiceId,
        // Carousel design options
        design_preset: data.designPreset,
        carousel_background: data.carouselBackground ? {
          type: data.carouselBackground.type,
          preset_id: data.carouselBackground.presetId,
          image_url: data.carouselBackground.imageUrl,
        } : undefined,
      };

      const response = await apiClient.post<ApiResponse<GenerationRequest>>(
        '/generate',
        payload,
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data;
    },

    getRequest: async (id: string) => {
      const response = await apiClient.get<ApiResponse<any>>(
        `/generate/${id}`
      );

      // Transform snake_case to camelCase
      const rawData = response.data.data;
      const transformedData: GenerationRequestDetail = {
        request: rawData.request ? {
          id: rawData.request.id,
          userId: rawData.request.user_id,
          inputType: rawData.request.input_type || 'text',
          inputText: rawData.request.input_text,
          inputVideoPath: rawData.request.input_video_path,
          inputAudioPath: rawData.request.input_audio_path,
          knowledgeBaseId: rawData.request.knowledge_base_id,
          platforms: rawData.request.platforms || [],
          tone: rawData.request.tone,
          additionalInstructions: rawData.request.additional_instructions,
          voiceId: rawData.request.voice_id,
          status: rawData.request.status,
          results: rawData.request.results,
          createdAt: rawData.request.created_at,
          completedAt: rawData.request.completed_at,
          errorMessage: rawData.request.error_message,
        } : rawData.request,
        content: rawData.content?.map((item: any) => ({
          id: item.id,
          platform: item.platform,
          content: item.content,
          voiceScore: item.voice_score,
          qualityScore: item.quality_score,
          metadata: item.metadata,
          createdAt: item.created_at,
        })),
        contentKit: rawData.contentKit ? {
          id: rawData.contentKit.id,
          userId: rawData.contentKit.user_id,
          videoUploadId: rawData.contentKit.video_upload_id,
          title: rawData.contentKit.title,
          contentLinkedin: rawData.contentKit.content_linkedin,
          contentTwitter: rawData.contentKit.content_twitter,
          contentInstagram: rawData.contentKit.content_instagram,
          contentBlog: rawData.contentKit.content_blog,
          contentEmail: rawData.contentKit.content_email,
          contentTiktok: rawData.contentKit.content_tiktok,
          contentYoutube: rawData.contentKit.content_youtube,
          contentVideoScript: rawData.contentKit.content_video_script,
          generationRequestId: rawData.contentKit.generation_request_id,
          contentGenerated: rawData.contentKit.content_generated,
          clipsGenerated: rawData.contentKit.clips_generated,
          createdAt: rawData.contentKit.created_at,
        } : undefined,
        clips: rawData.clips?.map((clip: any) => ({
          id: clip.id,
          videoUploadId: clip.video_upload_id || clip.videoUploadId,
          startTime: clip.start_time ?? clip.startTime,
          endTime: clip.end_time ?? clip.endTime,
          duration: clip.duration,
          title: clip.title || clip.topic,
          transcriptText: clip.transcript_text || clip.transcriptText,
          viralityScore: clip.virality_score ?? clip.viralityScore ?? clip.quality_score,
          qualityScore: clip.quality_score ?? clip.qualityScore,
          engagementPotential: clip.engagement_potential ?? clip.engagementPotential,
          selectionReason: clip.selection_reason || clip.selectionReason || clip.metadata?.reason,
          suggestedCaption: clip.suggested_caption || clip.suggestedCaption,
          format: clip.format,
          width: clip.width,
          height: clip.height,
          faceCropApplied: clip.face_crop_applied ?? clip.faceCropApplied,
          faceCropCenter: clip.face_crop_center || clip.faceCropCenter,
          hasCaptions: clip.has_captions ?? clip.hasCaptions,
          captionsBurnedIn: clip.captions_burned_in ?? clip.captionsBurnedIn ?? true,
          captionUrl: clip.caption_url || clip.captionUrl,
          captionStyle: clip.caption_style || clip.captionStyle || 'modern',
          captionPosition: clip.caption_position || clip.captionPosition || 'bottom',
          srtPath: clip.srt_path || clip.srtPath,
          thumbnailUrl: clip.thumbnail_url || clip.thumbnailUrl,
          exports: clip.exports?.map((exp: any) => ({
            format: exp.format,
            quality: exp.quality,
            url: exp.url || exp.storage_path,
            storagePath: exp.storage_path || exp.storagePath,
          })) || [],
          status: clip.status,
          sortOrder: clip.sort_order ?? clip.sortOrder ?? 0,
          isSelected: clip.is_selected ?? clip.isSelected ?? true,
          createdAt: clip.created_at || clip.createdAt,
          // Split-screen variant
          splitScreenUrl: clip.split_screen_url || clip.splitScreenUrl,
          splitScreenLayout: clip.split_screen_layout || clip.splitScreenLayout,
          // Template-aware segment metadata (from top-level columns or nested metadata)
          segmentMetadata: (clip.suggested_segment_id || clip.metadata?.suggested_segment_id) ? {
            suggestedSegmentId: clip.suggested_segment_id || clip.metadata?.suggested_segment_id,
            segmentConfidence: clip.segment_confidence ?? clip.metadata?.segment_confidence,
            segmentReasoning: clip.segment_reasoning || clip.metadata?.segment_reasoning,
            alternativeSegments: clip.alternative_segments || clip.metadata?.alternative_segments,
          } : undefined,
        })),
        carousel: rawData.carousel ? {
          id: rawData.carousel.id,
          userId: rawData.carousel.user_id,
          generationRequestId: rawData.carousel.generation_request_id,
          contentId: rawData.carousel.content_id,
          slideCount: rawData.carousel.slide_count,
          // New API uses designPreset, fallback to background_type for backwards compat
          designPreset: rawData.carousel.design_preset || rawData.carousel.background_type || 'default',
          backgroundType: rawData.carousel.background_type, // Keep for backwards compat
          slides: (rawData.carousel.slides || []).map((s: any) => ({
            ...s,
            template: s.template || s.slideType, // Map old slideType to new template
          })),
          qualityScore: rawData.carousel.quality_score,
          createdAt: rawData.carousel.created_at,
        } : undefined,
      };

      return {
        ...response.data,
        data: transformedData,
      } as ApiResponse<GenerationRequestDetail>;
    },

    listRequests: async (params?: { limit?: number; offset?: number; voice_id?: string }) => {
      const response = await apiClient.get<ApiResponse<any[]>>('/generate', { params });

      // Transform snake_case to camelCase for frontend consumption
      const transformedData = response.data.data?.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        inputType: item.input_type || 'text',
        inputText: item.input_text,
        inputVideoPath: item.input_video_path,
        inputAudioPath: item.input_audio_path,
        knowledgeBaseId: item.knowledge_base_id,
        voiceId: item.voice_id,
        platforms: item.platforms || [],
        tone: item.tone,
        additionalInstructions: item.additional_instructions,
        status: item.status,
        results: item.results,
        generatedTitle: item.generated_title,
        createdAt: item.created_at,
        completedAt: item.completed_at,
        errorMessage: item.error_message,
      })) || [];

      return {
        ...response.data,
        data: transformedData,
      } as ApiResponse<GenerationRequest[]>;
    },

    /** Delete a generation request and all associated content */
    deleteRequest: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/generate/${id}`,
        { timeout: DELETE_TIMEOUT }
      );
      return response.data;
    },

    provideFeedback: async (
      contentId: string,
      feedback: 'good' | 'bad' | 'neutral'
    ) => {
      const response = await apiClient.post(
        `/generate/feedback/${contentId}`,
        { feedback }
      );
      return response.data;
    },

    /** Generate content from a video URL (YouTube/Instagram) */
    generateFromUrl: async (
      url: string,
      platforms: string[],
      carouselBackground?: { type: string; preset?: string }
    ) => {
      const response = await apiClient.post<ApiResponse<GenerationRequest>>(
        '/generate/from-url',
        {
          url,
          platforms,
          carousel_background: carouselBackground,
        },
        { timeout: 180000 } // 3 min timeout for transcript extraction + generation
      );
      return response.data;
    },
  },

  // -------- KNOWLEDGE BASE --------
  kb: {
    list: async () => {
      const response =
        await apiClient.get<ApiResponse<KnowledgeBase[]>>('/kb');
      return response.data;
    },

    get: async (id: string) => {
      const response = await apiClient.get<ApiResponse<KnowledgeBase>>(
        `/kb/${id}`
      );
      return response.data;
    },

    create: async (name: string, isDefault?: boolean) => {
      const response = await apiClient.post<ApiResponse<KnowledgeBase>>(
        '/kb',
        { name, is_default: isDefault }
      );
      return response.data;
    },

    delete: async (id: string) => {
      const response = await apiClient.delete<ApiResponse>(`/kb/${id}`, {
        timeout: DELETE_TIMEOUT,
      });
      return response.data;
    },

    /**
     * Get unified content for a knowledge base
     * Returns all content items (files, paste, voice, social) with stats
     */
    getContent: async (kbId: string) => {
      const response = await apiClient.get<ApiResponse<UnifiedContentResponse>>(
        `/kb/${kbId}/content`
      );
      return response.data;
    },

    /** Chat with your KB content (returns SSE stream) */
    chat: async (kbId: string, query: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []) => {
      const response = await apiClient.post(`/kb/${kbId}/chat`, { query, conversationHistory }, {
        responseType: 'text',
        timeout: 60000,
        headers: { Accept: 'text/event-stream' },
        transformResponse: [(data: string) => data],
      });
      return response.data as string;
    },
  },

  // -------- FILE UPLOADS --------
  files: {
    upload: async (kbId: string, file: File, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[api-client] Starting file upload to KB:', kbId);
      try {
        const response = await apiClient.post(
          `/files/upload?kbId=${kbId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes for large file uploads
            onUploadProgress: (progressEvent) => {
              if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                console.log('[api-client] Upload progress:', percentCompleted);
                onProgress(percentCompleted);
              }
            },
          }
        );
        console.log('[api-client] Upload response received:', response.status, response.data);
        return response.data;
      } catch (error) {
        console.error('[api-client] Upload error:', error);
        throw error;
      }
    },

    list: async (kbId: string) => {
      const response = await apiClient.get(`/files?kbId=${kbId}`);
      return response.data;
    },

    delete: async (fileId: string) => {
      const response = await apiClient.delete(`/files/${fileId}`);
      return response.data;
    },
  },

  // -------- SOCIAL INTEGRATIONS --------
  social: {
    getStatus: async () => {
      const response = await apiClient.get<
        ApiResponse<SocialIntegration[]>
      >('/social/status');
      return response.data;
    },

    connect: async (platform: string) => {
      const response = await apiClient.get(`/social/connect/${platform}`);
      return response.data;
    },

    disconnect: async (platform: string) => {
      const response = await apiClient.post(
        `/social/disconnect/${platform}`
      );
      return response.data;
    },

    callback: async (
      platform: string,
      code: string,
      state: string
    ) => {
      const response = await apiClient.get(
        `/social/callback/${platform}`,
        {
          params: { code, state },
        }
      );
      return response.data;
    },

    /** Start a Google sync job (syncs YouTube, Calendar, Contacts, Drive, Photos) */
    syncGoogle: async (options?: {
      knowledgeBaseId?: string;
      syncOptions?: {
        youtube?: boolean;
        calendar?: boolean;
        contacts?: boolean;
        drive?: boolean;
        photos?: boolean;
      };
    }) => {
      const response = await apiClient.post('/social/google/sync', options || {});
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          platform: 'google';
          message?: string;
        };
      };
    },

    /** Check Google sync job status */
    getGoogleSyncStatus: async (jobId: string) => {
      const response = await apiClient.get(`/social/google/sync/${jobId}`);
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          platform: 'google';
          contentCount?: number;
          chunksCreated?: number;
          message?: string;
        };
      };
    },

    /** Start an Instagram sync job (imports latest posts) */
    syncInstagram: async (options?: { max_posts?: number; knowledgeBaseId?: string }) => {
      const response = await apiClient.post('/social/instagram/sync', options || { max_posts: 50 });
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          platform: 'instagram';
          message?: string;
        };
      };
    },

    /** Check Instagram sync job status */
    getInstagramSyncStatus: async (jobId: string) => {
      const response = await apiClient.get(`/social/instagram/sync/${jobId}`);
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          platform: 'instagram';
          postsImported?: number;
          totalPosts?: number;
          message?: string;
        };
      };
    },

    /** Get voice integration assignments */
    getVoiceAssignments: async () => {
      const response = await apiClient.get('/social/voice-assignments');
      return response.data as {
        success: boolean;
        data: Array<{ integrationId: string; voiceId: string | null }>;
      };
    },

    /** Assign an integration to a voice (null voiceId = shared) */
    assignToVoice: async (integrationId: string, voiceId: string | null) => {
      const response = await apiClient.post('/social/voice-assignments', {
        integration_id: integrationId,
        voice_id: voiceId,
      });
      return response.data as { success: boolean };
    },

    /** Remove a voice integration assignment */
    removeFromVoice: async (integrationId: string, voiceId: string | null) => {
      const response = await apiClient.delete('/social/voice-assignments', {
        data: {
          integration_id: integrationId,
          voice_id: voiceId,
        },
      });
      return response.data as { success: boolean };
    },

    /** Get integrations available for a specific voice */
    getVoiceIntegrations: async (voiceId: string) => {
      const response = await apiClient.get(`/social/voice/${voiceId}/integrations`);
      return response.data as {
        success: boolean;
        data: Array<{
          id: string;
          platform: string;
          platformUsername?: string;
          status: string;
          lastSyncAt?: string;
          createdAt: string;
        }>;
      };
    },
  },

  // -------- USER PROFILE --------
  profile: {
    get: async () => {
      const response = await apiClient.get('/profile');
      return response.data;
    },

    update: async (data: {
      name?: string;
      avatar?: string;
      bio?: string;
    }) => {
      const response = await apiClient.patch('/profile', data);
      return response.data;
    },
  },

  // -------- VOICE STATUS --------
  voice: {
    getStatus: async () => {
      const response = await apiClient.get('/voice/status');
      return response.data as {
        success: boolean;
        data?: {
          hasVoiceProfile: boolean;
          contentCount: number;
          lastUpdated?: string;
        };
      };
    },

    refreshProfile: async () => {
      const response = await apiClient.post('/voice/profile/refresh');
      return response.data as {
        success: boolean;
        message?: string;
      };
    },

    getStrength: async () => {
      const response = await apiClient.get('/voice/strength');
      return response.data as {
        success: boolean;
        data?: {
          overallStrength: number;
          waveformData: number[];
          profileCompleteness: {
            samplesAnalyzed: number;
            signaturePhrasesFound: number;
            toneMarkersFound: number;
            sourceDiversity: number;
          };
          recentPerformance: {
            avgVoiceScore: number;
            avgEmbeddingSimilarity: number;
            generationCount: number;
          };
          dimensionBreakdown: {
            signaturePresence: number;
            avoidAbsence: number;
            styleAlignment: number;
            aiBlacklistAbsence: number;
            embeddingSimilarity: number | null;
          };
        };
      };
    },
  },

  // -------- KB CONTENT (PASTE, VOICE, MBOX, SOCIAL) --------
  kbContent: {
    paste: async (data: {
      text: string;
      title?: string;
      sourceType: 'writing_sample' | 'social_post' | 'email' | 'text';
      knowledgeBaseId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const response = await apiClient.post('/kb/content/paste', data);
      return response.data;
    },

    pasteBulk: async (data: {
      items: Array<{
        text: string;
        title?: string;
        sourceType: 'writing_sample' | 'social_post' | 'email' | 'text';
        metadata?: Record<string, unknown>;
      }>;
      knowledgeBaseId?: string;
    }) => {
      const response = await apiClient.post('/kb/content/paste/bulk', data);
      return response.data;
    },

    deleteContent: async (contentId: string) => {
      const response = await apiClient.delete(`/kb/content/${contentId}`, {
        timeout: DELETE_TIMEOUT,
      });
      return response.data;
    },

    getTypes: async () => {
      const response = await apiClient.get('/kb/content/types');
      return response.data;
    },

    // -------- VOICE RECORDING --------
    /** Transcribe audio only (returns text, no ingestion) */
    transcribeVoice: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await apiClient.post('/kb/content/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60 seconds for transcription
      });
      return response.data as { success: boolean; text: string; duration?: number };
    },

    /** Transcribe and ingest voice content into KB */
    ingestVoice: async (data: {
      audioBlob: Blob;
      title?: string;
      knowledgeBaseId?: string;
    }) => {
      const formData = new FormData();
      formData.append('audio', data.audioBlob, 'recording.webm');
      if (data.title) formData.append('title', data.title);
      if (data.knowledgeBaseId) formData.append('knowledgeBaseId', data.knowledgeBaseId);

      const response = await apiClient.post('/kb/content/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for transcription + ingestion
      });
      return response.data as {
        success: boolean;
        contentId: string;
        transcription: string;
        chunksCreated: number;
        embeddingsCreated: number;
      };
    },

    // -------- MBOX EMAIL IMPORT --------
    /** Upload and ingest MBOX email archive (legacy - uploads raw file) */
    uploadMbox: async (
      mboxFile: File,
      options?: {
        userEmail?: string;
        knowledgeBaseId?: string;
      },
      onProgress?: (progress: number) => void
    ) => {
      const formData = new FormData();
      formData.append('mbox', mboxFile);
      if (options?.userEmail) formData.append('userEmail', options.userEmail);
      if (options?.knowledgeBaseId) formData.append('knowledgeBaseId', options.knowledgeBaseId);

      const response = await apiClient.post('/kb/content/mbox', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minutes for large mbox files
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      return response.data as {
        success: boolean;
        contentId: string;
        emailsParsed: number;
        emailsIngested: number;
        chunksCreated: number;
        embeddingsCreated: number;
        skippedEmails: number;
        parseErrors: number;
      };
    },

    /** Ingest pre-parsed emails (client-side parsing for large files) */
    ingestParsedEmails: async (data: {
      emails: Array<{
        messageId: string;
        from: string;
        to: string;
        subject: string;
        date: string;
        textContent: string;
        contentHash: string;
      }>;
      knowledgeBaseId?: string;
      fileName?: string;
      parseStats?: {
        totalEmailsFound: number;
        emailsParsed: number;
        emailsFiltered: number;
        parseErrors: number;
      };
      onBatchProgress?: (batchNum: number, totalBatches: number) => void;
    }) => {
      const { emails, knowledgeBaseId, fileName, parseStats, onBatchProgress } = data;

      // Split into batches of 10 emails to stay under server chunk limits
      // Large emails with long threads can produce 100+ chunks each
      // Server caps at 2000 chunks per request to prevent timeouts
      const BATCH_SIZE = 10;
      const batches: typeof emails[] = [];
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        batches.push(emails.slice(i, i + BATCH_SIZE));
      }

      console.log(`[Email Upload] Splitting ${emails.length} emails into ${batches.length} batches of ${BATCH_SIZE}`);

      // Upload each batch and accumulate results
      let totalIngested = 0;
      let totalDuplicate = 0;
      let totalChunks = 0;
      let totalEmbeddings = 0;
      let contentId = '';
      let batchesCompleted = 0;
      let lastError: Error | null = null;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[Email Upload] Uploading batch ${i + 1}/${batches.length} (${batch.length} emails)`);

        if (onBatchProgress) {
          onBatchProgress(i + 1, batches.length);
        }

        try {
          const response = await apiClient.post('/kb/content/emails/batch', {
            emails: batch,
            knowledgeBaseId,
            fileName: i === 0 ? fileName : `${fileName} (batch ${i + 1})`,
            parseStats: i === 0 ? parseStats : undefined, // Only include stats on first batch
          }, {
            timeout: 30000, // Processing is async now - this just queues the batch
          });

          const result = response.data;
          totalIngested += result.emailsIngested || 0;
          totalDuplicate += result.emailsDuplicate || 0;
          totalChunks += result.chunksCreated || 0;
          totalEmbeddings += result.embeddingsCreated || 0;
          if (!contentId && result.contentId) {
            contentId = result.contentId;
          }
          batchesCompleted++;

          console.log(`[Email Upload] Batch ${i + 1} complete: ${result.emailsIngested} ingested, ${result.chunksCreated} chunks`);
        } catch (err) {
          console.error(`[Email Upload] Batch ${i + 1} failed:`, err);
          lastError = err instanceof Error ? err : new Error(String(err));

          // If we've completed at least half the batches, continue and return partial success
          // Otherwise, if this is an early failure, throw the error
          if (batchesCompleted < batches.length / 2) {
            throw lastError;
          }
          // Break out of loop but don't throw - we'll return partial success
          console.log(`[Email Upload] Partial success: ${batchesCompleted}/${batches.length} batches completed`);
          break;
        }
      }

      // Return results (even if partial)
      const isPartial = batchesCompleted < batches.length;
      return {
        success: true,
        partial: isPartial,
        contentId,
        emailsIngested: totalIngested,
        emailsDuplicate: totalDuplicate,
        chunksCreated: totalChunks,
        embeddingsCreated: totalEmbeddings,
        batchesCompleted,
        totalBatches: batches.length,
      };
    },

    // -------- SOCIAL MEDIA IMPORT --------
    /** Get available social platforms for import */
    getSocialPlatforms: async () => {
      const response = await apiClient.get('/kb/content/social/platforms');
      return response.data as {
        success: boolean;
        platforms: Array<{
          id: string;
          name: string;
          description: string;
          requiresUrl: boolean;
        }>;
      };
    },

    /** Start a social media import job */
    startSocialImport: async (data: {
      platform: 'youtube' | 'instagram' | 'blog';
      url: string;
      knowledgeBaseId?: string;
      useForVoiceMatching?: boolean; // Include in voice matching (default true for user's own content)
    }) => {
      const response = await apiClient.post('/kb/content/social/import', data, {
        timeout: 30000, // Just starts the job, doesn't wait
      });
      return response.data as {
        success: boolean;
        jobId: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        platform: string;
        message?: string;
      };
    },

    /** Check social import job status */
    getSocialImportStatus: async (jobId: string) => {
      const response = await apiClient.get(`/kb/content/social/import/${jobId}`);
      return response.data as {
        success: boolean;
        job: {
          jobId: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          platform: string;
          contentCount?: number;
          message?: string;
        } | null;
      };
    },
  },

  // -------- IMAGE GENERATION --------
  images: {
    generateBlogHeader: async (
      sourceContent: string,
      options?: ImageGenerationOptions,
      blogContent?: string
    ) => {
      const response = await apiClient.post<ApiResponse<{ image: GeneratedImage }>>(
        '/images/blog-header',
        { sourceContent, options, blogContent },
        { timeout: 60000 } // 60 seconds for image generation
      );
      return response.data;
    },

    generateCarousel: async (
      contentId: string,
      slides: Array<{ text: string; type?: string }>,
      options?: {
        background?: BackgroundConfig;
        contentSummary?: string;
      }
    ) => {
      const response = await apiClient.post<ApiResponse<{ carousel: GeneratedCarousel }>>(
        '/images/carousel',
        {
          contentId,
          slides,
          background: options?.background,
          contentSummary: options?.contentSummary,
        },
        { timeout: 120000 } // 2 minutes for carousel generation
      );
      return response.data;
    },

    generateCarouselWithUpload: async (
      contentId: string,
      slides: Array<{ text: string; type?: string }>,
      backgroundImage: File
    ) => {
      const formData = new FormData();
      formData.append('backgroundImage', backgroundImage);
      formData.append('contentId', contentId);
      formData.append('slides', JSON.stringify(slides));

      const response = await apiClient.post<ApiResponse<{ carousel: GeneratedCarousel }>>(
        '/images/carousel/with-upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000, // 3 minutes for upload + generation
        }
      );
      return response.data;
    },

    /**
     * Generate optimized carousel from Instagram content
     * Automatically structures slides for maximum engagement
     */
    generateOptimizedCarousel: async (
      contentId: string,
      instagramContent: string,
      userInput: string,
      options?: {
        background?: BackgroundConfig;
      }
    ) => {
      const response = await apiClient.post<
        ApiResponse<{
          carousel: GeneratedCarousel;
          quality?: { score: number };
        }>
      >(
        '/images/carousel',
        {
          contentId,
          instagramContent,
          userInput,
          background: options?.background,
        },
        { timeout: 120000 }
      );
      return response.data;
    },

    /**
     * Generate optimized carousel with uploaded background
     */
    generateOptimizedCarouselWithUpload: async (
      contentId: string,
      instagramContent: string,
      userInput: string,
      backgroundImage: File
    ) => {
      const formData = new FormData();
      formData.append('backgroundImage', backgroundImage);
      formData.append('contentId', contentId);
      formData.append('instagramContent', instagramContent);
      formData.append('userInput', userInput);

      const response = await apiClient.post<ApiResponse<{ carousel: GeneratedCarousel }>>(
        '/images/carousel/with-upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000,
        }
      );
      return response.data;
    },

    uploadBackground: async (image: File, contentId?: string) => {
      const formData = new FormData();
      formData.append('image', image);
      if (contentId) {
        formData.append('contentId', contentId);
      }

      const response = await apiClient.post<
        ApiResponse<{ background: { publicUrl: string; processed: boolean } }>
      >('/images/background/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      return response.data;
    },

    getBackgroundPresets: async () => {
      const response = await apiClient.get<
        ApiResponse<{ presets: BackgroundPreset[] }>
      >('/images/backgrounds/presets');
      return response.data;
    },

    deleteCarousel: async (contentId: string) => {
      const response = await apiClient.delete<ApiResponse>(
        `/images/carousel/${contentId}`,
        { timeout: DELETE_TIMEOUT }
      );
      return response.data;
    },

    getHealth: async () => {
      const response = await apiClient.get<
        ApiResponse<{
          status: string;
          services: {
            blogHeader: string;
            carousel: string;
            aiBackground: string;
            presets: string;
            upload: string;
          };
        }>
      >('/images/health');
      return response.data;
    },
  },

  // -------- CREATOR MONITORING & REPURPOSING --------
  creators: {
    /** Follow a new creator */
    follow: async (data: {
      platform: 'youtube' | 'instagram';
      creatorUrl: string;
      pollingIntervalSeconds?: number;
      automationEnabled?: boolean;
    }) => {
      const response = await apiClient.post('/creators/follow', data, { timeout: FOLLOW_TIMEOUT });
      return response.data as {
        success: boolean;
        creator: MonitoredCreator;
        initialContentCount: number;
        error?: string;
      };
    },

    /** Unfollow a creator */
    unfollow: async (creatorId: string) => {
      const response = await apiClient.delete(`/creators/${creatorId}`);
      return response.data as { success: boolean };
    },

    /** Get all followed creators */
    list: async () => {
      const response = await apiClient.get('/creators');
      return response.data as {
        success: boolean;
        creators: MonitoredCreator[];
        count: number;
      };
    },

    /** Get a single creator */
    get: async (creatorId: string) => {
      const response = await apiClient.get(`/creators/${creatorId}`);
      return response.data as {
        success: boolean;
        creator: MonitoredCreator;
      };
    },

    /** Update creator settings */
    update: async (creatorId: string, data: {
      automationEnabled?: boolean;
      pollingIntervalSeconds?: number;
    }) => {
      const response = await apiClient.patch(`/creators/${creatorId}`, data);
      return response.data as {
        success: boolean;
        creator: MonitoredCreator;
      };
    },

    /** Get content history for a creator */
    getContent: async (creatorId: string, limit?: number) => {
      const response = await apiClient.get(`/creators/${creatorId}/content`, {
        params: { limit },
      });
      return response.data as {
        success: boolean;
        content: ContentHistoryEntry[];
        count: number;
      };
    },

    /** Manually trigger poll for a creator */
    poll: async (creatorId: string) => {
      const response = await apiClient.post(`/creators/${creatorId}/poll`, undefined, { timeout: 60000 });
      return response.data as {
        success: boolean;
        newContentCount: number;
        entries: ContentHistoryEntry[];
      };
    },

    /** Poll all followed creators at once */
    pollAll: async () => {
      const response = await apiClient.post('/creators/poll-all', undefined, { timeout: 120000 });
      return response.data as {
        success: boolean;
        results: { creatorId: string; creatorName: string; newContentCount: number; error?: string }[];
        totalNew: number;
      };
    },

    /** Get new content across all followed creators */
    getNewContent: async (limit?: number) => {
      const response = await apiClient.get('/creators/content/new', {
        params: { limit },
      });
      return response.data as {
        success: boolean;
        content: ContentHistoryEntry[];
        count: number;
      };
    },

    /** Mark content as reviewed */
    markReviewed: async (contentId: string) => {
      const response = await apiClient.post(`/creators/content/${contentId}/reviewed`);
      return response.data as { success: boolean };
    },

    /** Get pending content for repurposing */
    getPendingRepurpose: async (limit?: number) => {
      const response = await apiClient.get('/creators/repurpose/pending', {
        params: { limit },
      });
      return response.data as {
        success: boolean;
        content: ContentHistoryEntry[];
        count: number;
      };
    },

    /** Repurpose content */
    repurpose: async (contentId: string, data: {
      platforms: string[];
      knowledgeBaseId?: string;
      tone?: string;
      additionalInstructions?: string;
      focusOnIdeas?: string[];
      differentiationAngle?: string;
      /** Carousel template preset */
      designPreset?: 'auto' | 'tweet-style' | 'text-box';
      /** For custom background image uploads */
      carouselBackground?: {
        type: 'preset' | 'ai' | 'image';
        presetId?: string;
        imageUrl?: string;
      };
    }) => {
      const response = await apiClient.post(`/creators/repurpose/${contentId}`, data, {
        timeout: GENERATION_TIMEOUT,
      });
      return response.data as {
        success: boolean;
        result: RepurposeResult;
      };
    },

    /** Generate AI suggestions for repurposing */
    getSuggestions: async (contentId: string) => {
      const response = await apiClient.post(`/creators/repurpose/${contentId}/suggestions`);
      return response.data as {
        success: boolean;
        suggestions: RepurposeSuggestion[];
        count: number;
      };
    },

    /** Get user's repurpose suggestions */
    getUserSuggestions: async (status?: 'suggested' | 'accepted' | 'rejected' | 'completed') => {
      const response = await apiClient.get('/creators/suggestions', {
        params: { status },
      });
      return response.data as {
        success: boolean;
        suggestions: RepurposeSuggestion[];
        count: number;
      };
    },

    /** Accept suggestion and generate */
    acceptSuggestion: async (suggestionId: string, knowledgeBaseId?: string) => {
      const response = await apiClient.post(`/creators/suggestions/${suggestionId}/accept`, {
        knowledgeBaseId,
      }, { timeout: GENERATION_TIMEOUT });
      return response.data as {
        success: boolean;
        result: RepurposeResult;
      };
    },

    /** Extract transcript for content */
    extractTranscript: async (contentId: string) => {
      const response = await apiClient.post(`/creators/content/${contentId}/extract`, {}, {
        timeout: TRANSCRIPTION_TIMEOUT, // Transcription can take 1-3 minutes
      });
      return response.data as {
        success: boolean;
        content: ContentHistoryEntry;
      };
    },

    /** Generate AI summary for content */
    generateSummary: async (contentId: string) => {
      const response = await apiClient.post(`/creators/content/${contentId}/summarize`);
      return response.data as {
        success: boolean;
        summary: {
          summary: string;
          keyIdea: string;
          potentialAngles: string[];
        };
        content: ContentHistoryEntry;
      };
    },

    /** Get notification preferences */
    getNotificationPreferences: async () => {
      const response = await apiClient.get('/creators/notifications/preferences');
      return response.data as {
        success: boolean;
        preferences: NotificationPreferences;
      };
    },

    /** Update notification preferences */
    updateNotificationPreferences: async (updates: Partial<NotificationPreferences>) => {
      const response = await apiClient.put('/creators/notifications/preferences', updates);
      return response.data as {
        success: boolean;
        preferences: NotificationPreferences;
      };
    },
  },

  // -------- CLIP FINDER --------
  clips: {
    /**
     * Upload a video file or URL for clip extraction
     * Uses direct-to-storage upload for files > 50MB for better reliability
     */
    upload: async (
      data: {
        file?: File;
        sourceType?: 'upload' | 'youtube' | 'instagram' | 'url' | 'loom' | 'zoom';
        sourceUrl?: string;
        zoomPassword?: string;
        knowledgeBaseId?: string;
        title?: string;
      },
      onProgress?: (progress: number) => void
    ) => {
      // For URL imports or no file, use regular endpoint
      if (!data.file || data.sourceType !== 'upload') {
        const formData = new FormData();
        if (data.file) {
          formData.append('video', data.file);
        }
        if (data.sourceType) formData.append('sourceType', data.sourceType);
        if (data.sourceUrl) formData.append('sourceUrl', data.sourceUrl);
        if (data.zoomPassword) formData.append('zoomPassword', data.zoomPassword);
        if (data.knowledgeBaseId) formData.append('knowledgeBaseId', data.knowledgeBaseId);
        if (data.title) formData.append('title', data.title);

        const response = await apiClient.post('/clips/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percentCompleted);
            }
          },
        });
        return response.data as {
          success: boolean;
          data: {
            upload: VideoUpload;
            message: string;
          };
        };
      }

      // Try R2 direct upload (fast, no encoding wait, resumable multipart)
      // Falls back to legacy Supabase upload if R2 is not configured
      try {
        return await api.clips.uploadViaR2(data.file, {
          knowledgeBaseId: data.knowledgeBaseId,
          title: data.title,
        }, onProgress);
      } catch (r2Err: any) {
        // 503 = R2 not configured, fall through to legacy upload
        if (r2Err?.response?.status !== 503) {
          throw r2Err; // Real error, don't swallow
        }
        console.log('[api-client] R2 not configured, falling back to direct upload');
      }

      // Fallback: for large files (>50MB), use direct upload to Supabase storage
      const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
      if (data.file.size > LARGE_FILE_THRESHOLD) {
        return api.clips.uploadDirect(data.file, {
          knowledgeBaseId: data.knowledgeBaseId,
          title: data.title,
        }, onProgress);
      }

      // For smaller files, use the regular multer-based upload
      const formData = new FormData();
      formData.append('video', data.file);
      if (data.knowledgeBaseId) formData.append('knowledgeBaseId', data.knowledgeBaseId);
      if (data.title) formData.append('title', data.title);

      const response = await apiClient.post('/clips/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for video uploads
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      return response.data as {
        success: boolean;
        data: {
          upload: VideoUpload;
          message: string;
        };
      };
    },

    /**
     * Direct upload to Supabase storage for large files
     * Uses signed URL to bypass server memory limits
     */
    uploadDirect: async (
      file: File,
      options?: {
        knowledgeBaseId?: string;
        title?: string;
      },
      onProgress?: (progress: number) => void
    ) => {
      // Dynamically import Supabase client to avoid circular deps
      const { supabase } = await import('./supabase');

      // Step 1: Initialize the upload and get signed URL
      console.log('[api-client] Initializing direct upload for large file:', {
        filename: file.name,
        size: file.size,
        type: file.type,
      });

      const initResponse = await apiClient.post('/clips/upload/init', {
        filename: file.name,
        mimeType: file.type || 'video/mp4',
        fileSizeBytes: file.size,
        knowledgeBaseId: options?.knowledgeBaseId,
        title: options?.title,
      });

      if (!initResponse.data.success || !initResponse.data.data) {
        throw new Error('Failed to initialize upload');
      }

      const { uploadId, storagePath, token } = initResponse.data.data;
      console.log('[api-client] Got signed URL for upload:', uploadId);

      // Step 2: Upload via TUS resumable protocol (handles chunking, retry, resume)
      console.log('[api-client] Uploading to Supabase storage via TUS...');
      if (onProgress) onProgress(5); // Starting upload

      const { Upload } = await import('tus-js-client');
      const { supabaseUrl, supabaseAnonKey } = await import('./supabase');

      // Get the user's session token for RLS-authorized uploads
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? supabaseAnonKey;

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          headers: {
            authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'video-uploads',
            objectName: storagePath,
            contentType: file.type || 'video/mp4',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunks (Supabase minimum)
          onError: (error) => {
            console.error('[api-client] TUS upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            console.log('[api-client] Upload progress:', pct + '%');
            if (onProgress) onProgress(Math.max(5, Math.min(pct, 90)));
          },
          onSuccess: () => {
            console.log('[api-client] TUS upload complete');
            resolve();
          },
        });

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            console.log('[api-client] Resuming previous upload');
            upload.resumeFromPreviousUpload(previousUploads[0]);
          } else {
            upload.start();
          }
        });
      });

      if (onProgress) onProgress(90); // Upload complete

      // Step 3: Complete the upload on our backend
      console.log('[api-client] Completing upload:', uploadId);
      const completeResponse = await apiClient.post(`/clips/upload/${uploadId}/complete`, {
        storagePath,
        fileSizeBytes: file.size,
        mimeType: file.type || 'video/mp4',
        originalFilename: file.name,
      });

      if (!completeResponse.data.success) {
        throw new Error('Failed to complete upload');
      }

      if (onProgress) onProgress(100);

      return completeResponse.data as {
        success: boolean;
        data: {
          upload: VideoUpload;
          message: string;
        };
      };
    },

    /**
     * Upload via R2 direct upload (presigned URL, no encoding wait).
     * Files >100MB use multipart upload with parallel chunks.
     * Processing starts immediately on completion — no transcoding wait.
     */
    uploadViaR2: async (
      file: File,
      options?: {
        knowledgeBaseId?: string;
        title?: string;
      },
      onProgress?: (progress: number) => void
    ) => {
      const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = Math.round(file.size / (1024 * 1024));
        throw new Error(
          `File is too large (${sizeMB}MB). Maximum upload size is 5GB. ` +
          `Try compressing the video or trimming it to a shorter length before uploading.`
        );
      }

      console.log('[api-client] Initializing R2 upload:', { filename: file.name, size: file.size });

      const initResponse = await apiClient.post('/clips/upload/r2-init', {
        filename: file.name,
        contentType: file.type || 'video/mp4',
        fileSize: file.size,
        knowledgeBaseId: options?.knowledgeBaseId,
        title: options?.title,
      });

      if (!initResponse.data.success || !initResponse.data.data) {
        throw new Error('Failed to initialize upload');
      }

      const { uploadId, multipart, presignedUrl, parts, partSize } = initResponse.data.data;
      console.log('[api-client] R2 upload initialized:', { uploadId, multipart });
      if (onProgress) onProgress(5);

      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Video upload in progress. Are you sure you want to leave?';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);

      try {
        if (multipart && parts) {
          const CONCURRENCY = 3;
          const completedParts: Array<{ partNumber: number; etag: string }> = [];
          let completedBytes = 0;

          const uploadPart = async (part: { partNumber: number; url: string }) => {
            const start = (part.partNumber - 1) * partSize;
            const end = Math.min(start + partSize, file.size);
            const chunk = file.slice(start, end);

            const response = await fetch(part.url, {
              method: 'PUT',
              body: chunk,
              headers: { 'Content-Type': 'application/octet-stream' },
            });

            if (!response.ok) {
              throw new Error(`Part ${part.partNumber} upload failed: ${response.status}`);
            }

            const etag = response.headers.get('ETag') || '';
            completedParts.push({ partNumber: part.partNumber, etag });
            completedBytes += (end - start);

            if (onProgress) {
              const pct = Math.round((completedBytes / file.size) * 80) + 5;
              onProgress(Math.min(pct, 85));
            }

            apiClient.post(`/clips/upload/${uploadId}/upload-progress`, {
              bytesUploaded: completedBytes,
              totalBytes: file.size,
            }).catch(() => {});
          };

          for (let i = 0; i < parts.length; i += CONCURRENCY) {
            const batch = parts.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(uploadPart));
          }

          const completeResponse = await apiClient.post(`/clips/upload/${uploadId}/r2-complete`, {
            parts: completedParts.sort((a, b) => a.partNumber - b.partNumber),
          });

          if (!completeResponse.data.success) {
            throw new Error('Failed to complete multipart upload');
          }
        } else if (presignedUrl) {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable && onProgress) {
                const pct = Math.round((e.loaded / e.total) * 80) + 5;
                onProgress(Math.min(pct, 85));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed: ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('Upload failed: network error'));
            xhr.send(file);
          });

          await apiClient.post(`/clips/upload/${uploadId}/r2-complete`, {});
        }

        if (onProgress) onProgress(100);

        // Return immediately — r2-complete triggers processing server-side.
        // The generation form's Step 2 (api.clips.process) handles the
        // processing progress via SSE. No need to poll here.
        console.log('[api-client] R2 upload complete, processing triggered server-side');

        // Fetch the upload record so the form has the upload ID for Step 2
        const statusResponse = await apiClient.get(`/clips/${uploadId}`);
        const upload = statusResponse.data?.data?.upload;

        return { success: true, data: { upload, message: 'Video uploaded via R2' } };
      } finally {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    },

    /** Start processing pipeline for a video */
    process: async (uploadId: string, config?: {
      maxClips?: number;
      minClipDuration?: number;
      maxClipDuration?: number;
      targetFormat?: 'portrait' | 'landscape' | 'square';
      captionStyle?: 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight' | 'karaoke' | 'underline' | 'word_by_word';
      generateContent?: boolean;
      knowledgeBaseId?: string;
      /**
       * Normalize video before processing (audio loudness + codec standardization)
       * Improves transcription accuracy with consistent audio levels.
       * Default: true (enabled)
       */
      normalizeVideo?: boolean | {
        /** Target loudness in LUFS (-23 broadcast, -16 streaming, -14 loud). Default: -16 */
        targetLoudness?: number;
        /** Skip video re-encoding, only normalize audio */
        audioOnly?: boolean;
      };
      /** Carousel template preset */
      designPreset?: 'auto' | 'tweet-style' | 'text-box';
      /** For custom background image uploads */
      carouselBackground?: {
        type: 'preset' | 'ai' | 'image';
        presetId?: string;
        imageUrl?: string;
      };
      /** Generate reel content (hook, segments, CTA) from transcript */
      generateReel?: boolean;
      /** Reel template ID (undefined for auto-select) */
      reelTemplate?: string;
      /** Music track ID for reel (undefined for auto, null for no music) */
      reelMusicTrackId?: string | null;
    }) => {
      const response = await apiClient.post(`/clips/${uploadId}/process`, config || {}, {
        timeout: 300000, // 5 minutes for video processing
      });
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: string;
          message: string;
        };
      };
    },

    /** Get upload with clips and content kit */
    get: async (uploadId: string) => {
      const response = await apiClient.get(`/clips/${uploadId}`);
      return response.data as {
        success: boolean;
        data: {
          upload: VideoUpload;
          clips: VideoClip[];
          contentKit: ContentKit | null;
        };
      };
    },

    /**
     * Recover a Zoom upload that failed with errorCode 'zoom_password_required'
     * or 'zoom_password_incorrect' by supplying the meeting passcode. Re-runs
     * the processing pipeline; poll GET /clips/:id for status updates as usual.
     */
    retryWithPassword: async (uploadId: string, password: string) => {
      const response = await apiClient.post(
        `/clips/${uploadId}/retry-with-password`,
        { password },
        { timeout: 300000 },
      );
      return response.data as {
        success: boolean;
        data: {
          jobId: string;
          status: string;
          message: string;
        };
      };
    },

    /** Get job status */
    getJob: async (uploadId: string, jobId: string) => {
      const response = await apiClient.get(`/clips/${uploadId}/job/${jobId}`);
      return response.data as {
        success: boolean;
        data: {
          job: ClipJob;
        };
      };
    },

    /** List user's video uploads */
    list: async (limit?: number, offset?: number) => {
      const response = await apiClient.get('/clips', { params: { limit, offset } });
      return response.data as {
        success: boolean;
        data: {
          uploads: VideoUpload[];
        };
      };
    },

    /** Update a clip */
    updateClip: async (uploadId: string, clipId: string, data: {
      title?: string;
      isSelected?: boolean;
      captionStyle?: string;
      captionPosition?: 'bottom' | 'center' | 'top';
      startTime?: number;
      endTime?: number;
    }) => {
      const response = await apiClient.patch(`/clips/${uploadId}/clips/${clipId}`, data);
      return response.data as {
        success: boolean;
        data: {
          clip: VideoClip;
        };
      };
    },

    /** Export a clip */
    exportClip: async (uploadId: string, clipId: string, options?: {
      format?: 'portrait' | 'landscape' | 'square';
      quality?: '720p' | '1080p' | '4k';
      captionStyle?: string;
      viewMode?: 'single' | 'split';
      addCaptions?: boolean;
    }) => {
      const response = await apiClient.post(`/clips/${uploadId}/clips/${clipId}/export`, options || {}, { timeout: EXPORT_TIMEOUT });
      return response.data as {
        success: boolean;
        data: {
          export: {
            format: string;
            quality: string;
            url: string | null;
            message?: string;
          };
        };
      };
    },

    /** Delete an upload */
    delete: async (uploadId: string) => {
      const response = await apiClient.delete(`/clips/${uploadId}`, {
        timeout: DELETE_TIMEOUT,
      });
      return response.data as {
        success: boolean;
        data: {
          message: string;
        };
      };
    },

    /** Extract B-roll from uploaded video */
    extractBRoll: async (uploadId: string, data: import('../types').ExtractBRollInput) => {
      const response = await apiClient.post(`/clips/${uploadId}/extract-broll`, {
        max_clips: data.maxClips,
        speed_up: data.speedUp,
        use_vision_scoring: data.useVisionScoring,
      }, { timeout: GENERATION_TIMEOUT });
      return response.data as ApiResponse<{ jobId: string; status: string }>;
    },
  },

  // -------- CONTENT KITS --------
  contentKits: {
    /** Get content kit with full data */
    get: async (kitId: string) => {
      const response = await apiClient.get(`/content-kits/${kitId}`);
      return response.data as {
        success: boolean;
        data: {
          kit: ContentKit;
          upload: VideoUpload;
          clips: VideoClip[];
        };
      };
    },

    /** List user's content kits (slim response — boolean platform flags, no content text) */
    list: async (limit?: number, offset?: number) => {
      const response = await apiClient.get('/content-kits', {
        params: { limit, offset },
        timeout: LIST_TIMEOUT,
      });

      // Transform snake_case to camelCase for frontend consumption.
      // The list endpoint returns has_* boolean flags instead of full content text.
      const transformedKits = (response.data.data?.kits || []).map((kit: any) => ({
        id: kit.id,
        userId: kit.user_id,
        videoUploadId: kit.video_upload_id,
        title: kit.title,
        description: kit.description,
        hasLinkedin: kit.has_linkedin || false,
        hasTwitter: kit.has_twitter || false,
        hasInstagram: kit.has_instagram || false,
        hasBlog: kit.has_blog || false,
        hasEmail: kit.has_email || false,
        hasTiktok: kit.has_tiktok || false,
        hasYoutube: kit.has_youtube || false,
        hasVideoScript: kit.has_video_script || false,
        generationRequestId: kit.generation_request_id,
        voiceId: kit.voice_id,
        clipsGenerated: kit.clips_generated || 0,
        contentGenerated: kit.content_generated || false,
        createdAt: kit.created_at,
        updatedAt: kit.updated_at,
        thumbnailUrl: kit.thumbnail_url || undefined,
        // Include joined video_uploads data if present
        video_uploads: kit.video_uploads,
      }));

      return {
        success: response.data.success,
        data: {
          kits: transformedKits as ContentKitListItem[],
        },
      };
    },

    /** Update content kit */
    update: async (kitId: string, data: {
      title?: string;
      description?: string;
      contentLinkedin?: string;
      contentTwitter?: string;
      contentInstagram?: string;
      contentBlog?: string;
      contentEmail?: string;
      contentTiktok?: string;
      contentYoutube?: string;
    }) => {
      const response = await apiClient.patch(`/content-kits/${kitId}`, data);
      return response.data as {
        success: boolean;
        data: {
          kit: ContentKit;
        };
      };
    },

    /** Regenerate written content */
    regenerate: async (kitId: string, options?: {
      platforms?: string[];
      knowledgeBaseId?: string;
      additionalInstructions?: string;
    }) => {
      const response = await apiClient.post(`/content-kits/${kitId}/regenerate`, options || {}, {
        timeout: GENERATION_TIMEOUT,
      });
      return response.data as {
        success: boolean;
        data: {
          kit: ContentKit;
          regenerated: string[];
          message: string;
        };
      };
    },

    /** Delete content kit */
    delete: async (kitId: string) => {
      const response = await apiClient.delete(`/content-kits/${kitId}`, {
        timeout: DELETE_TIMEOUT,
      });
      return response.data as {
        success: boolean;
        data: {
          message: string;
        };
      };
    },

    /** Regenerate carousel with a different design preset or background */
    regenerateCarousel: async (kitId: string, options: {
      designPreset?: 'tweet-style' | 'text-box' | 'auto';
      background?: { type: 'preset' | 'image'; presetId?: string; imageUrl?: string };
      slideOverrides?: Array<{ text?: string; textPosition?: 'top' | 'center' | 'bottom' }>;
    }) => {
      const response = await apiClient.post(
        `/content-kits/${kitId}/regenerate-carousel`,
        options,
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data as {
        success: boolean;
        data: {
          carousel: {
            id: string;
            slideCount: number;
            designPreset: string;
            slides: Array<{
              slideNumber: number;
              text: string;
              publicUrl: string;
              slideType?: string;
              template?: string;
            }>;
          };
        };
      };
    },

    /** Resize carousel to different aspect ratio */
    resizeCarousel: async (kitId: string, aspectRatio: '1:1' | '9:16') => {
      const response = await apiClient.post(
        `/content-kits/${kitId}/resize-carousel`,
        { aspectRatio },
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data as {
        success: boolean;
        data: {
          carousel: {
            id: string;
            slideCount: number;
            backgroundType: string;
            aspectRatio: '1:1' | '9:16';
            slides: Array<{
              slideNumber: number;
              text: string;
              publicUrl: string;
              slideType: string;
            }>;
          };
        };
      };
    },

    /** Generate AI reel content (hook, overlays, CTA) for a content kit */
    generateReelContent: async (
      kitId: string,
      templateId?: string,
      contentType?: 'tutorial' | 'transformation' | 'lifestyle' | 'promotional'
    ) => {
      const response = await apiClient.post(
        `/content-kits/${kitId}/generate-reel-content`,
        { templateId, contentType },
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data as {
        success: boolean;
        data: {
          reelContent: {
            hookText: string;
            segmentOverlays: Array<{
              segmentId: string;
              text: string;
              position: 'top' | 'center' | 'bottom';
            }>;
            ctaText: string;
            captionScript?: string;
            suggestedTemplate?: string;
            generatedAt: string;
          };
        };
      };
    },

    /** Get reel project linked to a content kit */
    getLinkedReel: async (kitId: string) => {
      const response = await apiClient.get(`/content-kits/${kitId}/reel`);
      return response.data as {
        success: boolean;
        data: {
          project: ReelProject;
          clips: ReelProjectClip[];
          template?: ReelTemplate;
          musicTrack?: MusicTrack | null;
        } | null;
      };
    },

    /** Create a reel project from a content kit */
    createReelFromKit: async (
      kitId: string,
      data: {
        templateId: string;
        clips: Array<{
          segmentId: string;
          sourceUrl: string;
          trimStartMs?: number;
          trimEndMs?: number;
        }>;
        musicTrackId?: string;
        addCaptions?: boolean;
        captionPreset?: 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight' | 'karaoke' | 'underline' | 'word_by_word';
      }
    ) => {
      const response = await apiClient.post(
        `/content-kits/${kitId}/create-reel`,
        data,
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data as {
        success: boolean;
        data: {
          project: ReelProject;
        };
      };
    },

    /** Generate animated MP4 reel from carousel slides */
    generateCarouselReel: async (kitId: string, options?: {
      musicTrackId?: string;
      smartTiming?: boolean;
    }) => {
      const response = await apiClient.post(
        `/content-kits/${kitId}/generate-carousel-reel`,
        {
          music_track_id: options?.musicTrackId,
          smart_timing: options?.smartTiming,
        },
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data as {
        success: boolean;
        data: {
          projectId: string;
          status: string;
          trendingAudioName?: string;
        };
      };
    },
  },

  // -------- STRIPE / BILLING --------
  stripe: {
    /** Get available pricing plans */
    getPlans: async (): Promise<StripePlansResponse> => {
      const response = await apiClient.get('/stripe/plans');
      return response.data;
    },

    /** Get current subscription status
     * @param justPaid - Set to true after checkout to force sync from Stripe (handles webhook race condition)
     */
    getSubscription: async (justPaid?: boolean): Promise<StripeSubscriptionResponse> => {
      const params = justPaid ? '?just_paid=true' : '';
      const response = await apiClient.get(`/stripe/subscription${params}`);
      return response.data;
    },

    /** Create checkout session and get redirect URL */
    createCheckoutSession: async (
      planId: PlanId,
      billingInterval: 'month' | 'year'
    ): Promise<StripeCheckoutResponse> => {
      // Get Affonso referral ID for affiliate attribution
      const referralId = typeof window !== 'undefined' ? (window as any).affonso_referral : undefined;

      const response = await apiClient.post('/stripe/checkout', {
        planId,
        billingInterval,
        successUrl: `${window.location.origin}/app/billing?success=true${localStorage.getItem('needsOnboarding') ? '&onboarding=true' : ''}`,
        cancelUrl: `${window.location.origin}/app/billing?canceled=true`,
        ...(referralId && { clientReferenceId: referralId }),
      });
      return response.data;
    },

    /** Get customer portal URL for managing subscription */
    getPortalUrl: async (): Promise<StripePortalResponse> => {
      const response = await apiClient.post('/stripe/portal', {
        returnUrl: `${window.location.origin}/app/billing`,
      });
      return response.data;
    },

    /** Get usage limits for current tier */
    getUsageLimits: async (): Promise<StripeUsageLimitsResponse> => {
      const response = await apiClient.get('/stripe/usage');
      return response.data;
    },

    /** Sync subscription status from Stripe (for recovering from missed webhooks) */
    syncSubscription: async (): Promise<{
      success: boolean;
      data: {
        synced: boolean;
        message: string;
        tier: string;
        status?: string;
        isTrialing?: boolean;
        currentPeriodEnd?: string;
      };
    }> => {
      const response = await apiClient.post('/stripe/sync');
      return response.data;
    },

    /** Switch to a different plan (upgrade or downgrade) */
    switchPlan: async (
      planId: PlanId,
      billingInterval: 'month' | 'year'
    ): Promise<{
      success: boolean;
      data: {
        success: boolean;
        tier: string;
        status: string;
      };
    }> => {
      const response = await apiClient.post('/stripe/subscription/switch', {
        planId,
        billingInterval,
      });
      return response.data;
    },
  },

  // -------- VIDEO SNAPSHOTS --------
  snapshots: {
    /** Get all snapshots for a video upload */
    getForUpload: async (uploadId: string) => {
      const response = await apiClient.get(`/snapshots/${uploadId}`);
      return response.data as {
        success: boolean;
        data: {
          snapshots: VideoSnapshot[];
        };
      };
    },

    /** Get snapshots for a content kit's associated video */
    getForContentKit: async (contentKitId: string) => {
      const response = await apiClient.get(`/snapshots/by-content-kit/${contentKitId}`);
      return response.data as {
        success: boolean;
        data: {
          snapshots: VideoSnapshot[];
          hasVideo: boolean;
          videoUploadId?: string;
        };
      };
    },

    /** Get a single snapshot by ID */
    get: async (snapshotId: string) => {
      const response = await apiClient.get(`/snapshots/single/${snapshotId}`);
      return response.data as {
        success: boolean;
        data: {
          snapshot: VideoSnapshot;
        };
      };
    },
  },

  // -------- CONTENT SCHEDULING --------
  scheduling: {
    /** List scheduled posts for a date range */
    list: async (filters?: {
      startDate?: string;
      endDate?: string;
      status?: 'scheduled' | 'posted' | 'skipped';
      contentCategory?: string;
    }) => {
      const response = await apiClient.get('/scheduling', { params: filters });
      // Transform snake_case to camelCase
      const posts = (response.data.data?.posts || []).map((post: any) => ({
        id: post.id,
        contentKitId: post.content_kit_id,
        generatedContentId: post.generated_content_id,
        title: post.title,
        scheduledFor: post.scheduled_for,
        platforms: post.platforms,
        contentCategory: post.content_category,
        contentType: post.content_type,
        contentSnapshot: post.content_snapshot,
        status: post.status,
        postedAt: post.posted_at,
        notes: post.notes,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        contentKit: post.content_kit ? {
          id: post.content_kit.id,
          title: post.content_kit.title,
          description: post.content_kit.description,
          thumbnailUrl: post.content_kit.thumbnail_url,
        } : undefined,
      }));
      return {
        success: response.data.success,
        data: { posts },
        timestamp: response.data.timestamp,
      };
    },

    /** Get AI-suggested schedule for a week */
    getSuggestions: async (weekStart?: string) => {
      const response = await apiClient.get('/scheduling/suggestions', {
        params: { weekStart },
      });
      return response.data;
    },

    /** Get content kits that haven't been scheduled */
    getUnscheduled: async () => {
      const response = await apiClient.get('/scheduling/unscheduled');
      // Transform snake_case to camelCase
      const content = (response.data.data?.content || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl || item.thumbnail_url,
        createdAt: item.createdAt || item.created_at,
      }));
      return {
        success: response.data.success,
        data: { content },
        timestamp: response.data.timestamp,
      };
    },

    /** Get available content categories */
    getCategories: async () => {
      const response = await apiClient.get('/scheduling/categories');
      return response.data;
    },

    /** Create a scheduled post */
    create: async (data: {
      contentKitId?: string;
      generatedContentId?: string;
      title?: string;
      scheduledFor: string;
      platforms: string[];
      contentCategory?: string;
      contentType?: 'written' | 'clips' | 'carousel';
      contentSnapshot?: {
        type: 'written' | 'clips' | 'carousel';
        text?: string;
        videoUrl?: string;
        thumbnailUrl?: string;
        suggestedCaption?: string;
        carouselSlides?: Array<{
          slideNumber: number;
          imageUrl: string;
          text?: string;
        }>;
      };
      notes?: string;
    }) => {
      const response = await apiClient.post('/scheduling', data);
      const post = response.data.data?.post;
      return {
        success: response.data.success,
        data: {
          post: post ? {
            id: post.id,
            contentKitId: post.content_kit_id,
            generatedContentId: post.generated_content_id,
            title: post.title,
            scheduledFor: post.scheduled_for,
            platforms: post.platforms,
            contentCategory: post.content_category,
            contentType: post.content_type,
            contentSnapshot: post.content_snapshot,
            status: post.status,
            postedAt: post.posted_at,
            notes: post.notes,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
          } : undefined,
        },
        timestamp: response.data.timestamp,
      };
    },

    /** Update a scheduled post */
    update: async (
      id: string,
      data: {
        scheduledFor?: string;
        platforms?: string[];
        contentCategory?: string;
        status?: 'scheduled' | 'posted' | 'skipped';
        notes?: string;
      }
    ) => {
      const response = await apiClient.patch(`/scheduling/${id}`, data);
      const post = response.data.data?.post;
      return {
        success: response.data.success,
        data: {
          post: post ? {
            id: post.id,
            contentKitId: post.content_kit_id,
            generatedContentId: post.generated_content_id,
            title: post.title,
            scheduledFor: post.scheduled_for,
            platforms: post.platforms,
            contentCategory: post.content_category,
            status: post.status,
            postedAt: post.posted_at,
            notes: post.notes,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
          } : undefined,
        },
        timestamp: response.data.timestamp,
      };
    },

    /** Delete a scheduled post */
    delete: async (id: string) => {
      const response = await apiClient.delete(`/scheduling/${id}`);
      return response.data;
    },

    /** Mark a scheduled post as posted */
    markPosted: async (id: string) => {
      const response = await apiClient.post(`/scheduling/${id}/mark-posted`);
      return response.data;
    },

    /** Mark a scheduled post as skipped */
    skip: async (id: string) => {
      const response = await apiClient.post(`/scheduling/${id}/skip`);
      return response.data;
    },
  },

  // -------- TRENDS --------
  trends: {
    /** List trends with filters */
    list: async (params?: {
      page?: number;
      limit?: number;
      platform?: TrendPlatform;
      lifecycle?: TrendLifecycleStatus;
      curated?: boolean;
      niche?: string;
      tags?: string[];
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.platform) queryParams.set('platform', params.platform);
      if (params?.lifecycle) queryParams.set('lifecycle', params.lifecycle);
      if (params?.curated !== undefined) queryParams.set('curated', params.curated.toString());
      if (params?.niche) queryParams.set('niche', params.niche);
      if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));

      const response = await apiClient.get(`/trends?${queryParams.toString()}`);
      return response.data as {
        success: boolean;
        trends: Trend[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },

    /** Get available niches */
    getNiches: async () => {
      const response = await apiClient.get('/trends/niches');
      return response.data as { success: boolean; niches: string[] };
    },

    /** Get a single trend with analysis */
    get: async (trendId: string) => {
      const response = await apiClient.get(`/trends/${trendId}`);
      return response.data as { success: boolean; trend: TrendWithAnalysis };
    },

    /** Submit a new trend URL */
    submit: async (data: {
      source_url: string;
      source_platform?: TrendPlatform;
      niche?: string;
      tags?: string[];
    }) => {
      const response = await apiClient.post('/trends/submit', data);
      return response.data as { success: boolean; trend: Trend; message: string };
    },

    /** Get user's submitted trends */
    getMySubmissions: async (page?: number, limit?: number) => {
      const queryParams = new URLSearchParams();
      if (page) queryParams.set('page', page.toString());
      if (limit) queryParams.set('limit', limit.toString());
      const response = await apiClient.get(`/trends/my-submissions?${queryParams.toString()}`);
      return response.data as {
        success: boolean;
        submissions: Trend[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },

    /** Trigger analysis for a trend */
    analyze: async (trendId: string) => {
      const response = await apiClient.post(`/trends/${trendId}/analyze`);
      return response.data as { success: boolean; message: string; status: string };
    },

    /** Get analysis for a trend */
    getAnalysis: async (trendId: string) => {
      const response = await apiClient.get(`/trends/${trendId}/analysis`);
      return response.data as { success: boolean; analysis: TrendAnalysis };
    },

    /** Get creative brief for a trend */
    getBrief: async (trendId: string) => {
      const response = await apiClient.get(`/trends/${trendId}/brief`);
      return response.data as { success: boolean; brief: TrendCreativeBrief };
    },

    /** Create a copy of a trend */
    createCopy: async (trendId: string, data?: { selected_niche?: string; user_notes?: string }) => {
      const response = await apiClient.post(`/trends/${trendId}/copy`, data || {});
      return response.data as { success: boolean; copy: TrendCopy };
    },

    /** Get user's trend copies */
    getCopies: async (params?: { page?: number; limit?: number; status?: TrendGenerationStatus }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.status) queryParams.set('status', params.status);
      const response = await apiClient.get(`/trends/copies?${queryParams.toString()}`);
      return response.data as {
        success: boolean;
        copies: TrendCopyWithTrend[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },

    /** Get a specific trend copy */
    getCopy: async (copyId: string) => {
      const response = await apiClient.get(`/trends/copies/${copyId}`);
      return response.data as { success: boolean; copy: TrendCopyWithTrend };
    },

    /** Update a trend copy */
    updateCopy: async (copyId: string, data: {
      customized_script?: string;
      customized_shot_list?: TrendShotListItem[];
      user_notes?: string;
      selected_niche?: string;
    }) => {
      const response = await apiClient.patch(`/trends/copies/${copyId}`, data);
      return response.data as { success: boolean; copy: TrendCopy };
    },

    /** Delete a trend copy */
    deleteCopy: async (copyId: string) => {
      const response = await apiClient.delete(`/trends/copies/${copyId}`);
      return response.data as { success: boolean };
    },

    /** Generate content from a trend copy */
    generate: async (copyId: string, data: {
      platforms: string[];
      knowledge_base_id?: string;
      tone?: string;
      additional_instructions?: string;
    }) => {
      const response = await apiClient.post(`/trends/copies/${copyId}/generate`, data, { timeout: GENERATION_TIMEOUT });
      return response.data as { success: boolean; requestId: string; message: string };
    },

    /** Adapt a copy to a specific niche */
    adaptToNiche: async (copyId: string, niche: string) => {
      const response = await apiClient.post(`/trends/copies/${copyId}/adapt`, { niche });
      return response.data as { success: boolean; copy: TrendCopy };
    },
  },

  // -------- TREND DISCOVERY --------
  trendDiscovery: {
    /** List discovered trends */
    list: async (params?: { category?: string; platform?: string; limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.set('category', params.category);
      if (params?.platform) queryParams.set('platform', params.platform);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.offset) queryParams.set('offset', String(params.offset));
      const response = await apiClient.get(`/trends/discover?${queryParams.toString()}`);
      return response.data as {
        success: boolean;
        trends: TrendingReel[];
        pagination: { total: number; limit: number; offset: number };
      };
    },

    /** Get single trend detail */
    get: async (id: string) => {
      const response = await apiClient.get(`/trends/discover/${id}`);
      return response.data as { success: boolean; trend: TrendingReel };
    },

    /** Admin: refresh trends via web search */
    refresh: async (data?: { platform?: string; categories?: string[] }) => {
      const response = await apiClient.post('/trends/discover/refresh', data || {});
      return response.data as { success: boolean; message: string; trends: TrendingReel[] };
    },

    /** Generate a reel from a discovered trend */
    generateReel: async (trendId: string, data?: { brollAssetId?: string }) => {
      const response = await apiClient.post(`/trends/discover/${trendId}/generate`, data || {}, { timeout: GENERATION_TIMEOUT });
      return response.data as {
        success: boolean;
        reel: TrendUserReel;
        caption: string;
        hashtags: string[];
        message: string;
      };
    },

    /** List user's generated trend reels */
    listReels: async (params?: { limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.offset) queryParams.set('offset', String(params.offset));
      const response = await apiClient.get(`/trends/reels?${queryParams.toString()}`);
      return response.data as {
        success: boolean;
        reels: TrendUserReel[];
        pagination: { total: number; limit: number; offset: number };
      };
    },

    /** Get generated reel detail */
    getReel: async (id: string) => {
      const response = await apiClient.get(`/trends/reels/${id}`);
      return response.data as { success: boolean; reel: TrendUserReel };
    },

    /** Polish reel with Descript */
    polishReel: async (reelId: string, data?: { prompt?: string }) => {
      const response = await apiClient.post(`/trends/reels/${reelId}/polish`, data || {});
      return response.data as { success: boolean; project: unknown; job: unknown; message: string };
    },
  },

  // -------- ADMIN USAGE --------
  adminUsage: {
    /** Get platform-wide usage overview for a month */
    getOverview: async (month?: string) => {
      const params = month ? { month } : {};
      const response = await apiClient.get('/admin/usage/overview', { params });
      return response.data as { success: boolean; data: AdminUsageOverview };
    },

    /** Get cost breakdown by service */
    getByService: async (startDate?: string, endDate?: string) => {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await apiClient.get('/admin/usage/by-service', { params });
      return response.data as { success: boolean; data: AdminServiceBreakdown[] };
    },

    /** Get top users by spend */
    getByUser: async (month?: string, limit?: number, offset?: number) => {
      const params: Record<string, string | number> = {};
      if (month) params.month = month;
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;
      const response = await apiClient.get('/admin/usage/by-user', { params });
      return response.data as {
        success: boolean;
        data: AdminUserBreakdown[];
        pagination: { month: string; limit: number; offset: number };
      };
    },

    /** Get daily cost trends (chart data) */
    getTrends: async (startDate?: string, endDate?: string, service?: string) => {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (service) params.service = service;
      const response = await apiClient.get('/admin/usage/trends', { params });
      return response.data as { success: boolean; data: AdminDailyTrend[] };
    },

    /** Get live provider usage data */
    getProviders: async (compare?: boolean, month?: string) => {
      const params: Record<string, string> = {};
      if (compare) params.compare = 'true';
      if (month) params.month = month;
      const response = await apiClient.get('/admin/usage/providers', { params });
      return response.data as { success: boolean; data: Record<string, unknown> };
    },
  },

  // -------- ADMIN BUSINESS METRICS --------
  adminMetrics: {
    /** Get business metrics (MRR, ARR, subscribers, users) */
    get: async () => {
      const response = await apiClient.get('/admin/metrics');
      return response.data as { success: boolean; data: AdminBusinessMetrics; fromCache?: boolean };
    },
    getSegments: async (): Promise<{ success: boolean; data: AdminSegmentationData }> => {
      const res = await apiClient.get('/admin/metrics/segments');
      return res.data;
    },
  },

  // -------- ADMIN VOICE LAB --------
  adminVoiceLab: {
    /** Get aggregated voice similarity report (distribution + correlation) */
    getReport: async (days: number = 7) => {
      const res = await apiClient.get('/admin/voice-similarity-report', { params: { days } });
      return res.data as {
        success: boolean;
        data: {
          period: string;
          totalGenerations: number;
          generationsWithCentroid: number;
          similarityDistribution: {
            min: number;
            max: number;
            avg: number;
            median: number;
            p25: number;
            p75: number;
          } | null;
          byPlatform: Record<string, { avg: number; count: number }>;
          correlationWithVoiceScore: number | null;
          recommendation: string;
        };
      };
    },
    /** Get raw per-generation data points for scatter visualization */
    getRaw: async (days: number = 7, limit: number = 2000) => {
      const res = await apiClient.get('/admin/voice-similarity-report/raw', { params: { days, limit } });
      return res.data as {
        success: boolean;
        data: {
          period: string;
          count: number;
          points: Array<{
            id: string;
            platform: string;
            similarity: number;
            voiceScore: number;
            signaturePresence?: number;
            avoidAbsence?: number;
            styleAlignment?: number;
            aiBlacklistAbsence?: number;
            qualityScore?: number;
            createdAt: string;
          }>;
        };
      };
    },
  },

  // -------- ADMIN CAMPAIGNS --------
  adminCampaigns: {
    list: async () => {
      const response = await apiClient.get('/admin/campaigns');
      return response.data;
    },
    get: async (id: string) => {
      const response = await apiClient.get(`/admin/campaigns/${id}`);
      return response.data;
    },
    previewStep: async (id: string, stepNumber: number) => {
      const response = await apiClient.get(`/admin/campaigns/${id}/preview/${stepNumber}`);
      return response.data;
    },
    enroll: async (id: string, segmentName: string, dryRun = true) => {
      const response = await apiClient.post(`/admin/campaigns/${id}/enroll`, { segmentName, dryRun });
      return response.data;
    },
    pause: async (id: string) => {
      const response = await apiClient.post(`/admin/campaigns/${id}/pause`);
      return response.data;
    },
    resume: async (id: string) => {
      const response = await apiClient.post(`/admin/campaigns/${id}/resume`);
      return response.data;
    },
    enrollments: async (id: string, page = 1) => {
      const response = await apiClient.get(`/admin/campaigns/${id}/enrollments`, { params: { page } });
      return response.data;
    },
    enrollmentDetail: async (campaignId: string, enrollmentId: string) => {
      const response = await apiClient.get(`/admin/campaigns/${campaignId}/enrollments/${enrollmentId}`);
      return response.data;
    },
    pauseEnrollment: async (campaignId: string, enrollmentId: string) => {
      const response = await apiClient.post(`/admin/campaigns/${campaignId}/enrollments/${enrollmentId}/pause`);
      return response.data;
    },
    resumeEnrollment: async (campaignId: string, enrollmentId: string) => {
      const response = await apiClient.post(`/admin/campaigns/${campaignId}/enrollments/${enrollmentId}/resume`);
      return response.data;
    },
  },

  // -------- ADMIN EMAILS (editor v2) --------
  adminEmails: {
    listPresets: async (): Promise<Array<{ key: string; label: string; recommendedSegment: string }>> => {
      const res = await apiClient.get('/admin/emails/presets');
      return res.data;
    },
    getPreset: async (key: string): Promise<{ label: string; subject: string; bodyHtml: string; recommendedSegment: string }> => {
      const res = await apiClient.get(`/admin/emails/presets/${key}`);
      return res.data;
    },
    preview: async (segmentName: string, subject: string, bodyHtml: string) => {
      const res = await apiClient.post('/admin/emails/preview', { segmentName, subject, bodyHtml });
      return res.data as {
        subject: string;
        html: string;
        text: string;
        recipientCount: number;
        sample: { email: string; firstName: string; fullName: string | null };
        tokenWarnings: string[];
      };
    },
    send: async (segmentName: string, subject: string, bodyHtml: string, confirmCount: number) => {
      const res = await apiClient.post('/admin/emails/send', { segmentName, subject, bodyHtml, confirmCount }, { timeout: 120000 });
      return res.data as { sent: number; failed: number; failures: Array<{ email: string; reason: string }> };
    },
    sendTest: async (subject: string, bodyHtml: string) => {
      const res = await apiClient.post('/admin/emails/test', { subject, bodyHtml });
      return res.data as { sent: number; failed: number };
    },
    uploadImage: async (file: File): Promise<{ url: string; key: string }> => {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/admin/emails/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
  },

  // -------- ADMIN ERROR HEALTH --------
  adminErrors: {
    /** Get error health status (green/yellow/red) with counts and recent errors */
    getHealth: async () => {
      const response = await apiClient.get('/admin/errors/health');
      return response.data as { success: boolean; data: AdminErrorHealth };
    },
  },

  // -------- HELP CHAT --------
  help: {
    /** Send a chat message (returns SSE stream) */
    chat: async (query: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []) => {
      const response = await apiClient.post('/help/chat', { query, conversationHistory }, {
        responseType: 'text',
        timeout: 60000,
        headers: { Accept: 'text/event-stream' },
        // Axios doesn't natively stream SSE - we return raw text for manual parsing
        transformResponse: [(data: string) => data],
      });
      return response.data as string;
    },

    /** Get help articles */
    getArticles: async (category?: string) => {
      const params = category ? { category } : {};
      const response = await apiClient.get('/help/articles', { params });
      return response.data as { success: boolean; data: { articles: HelpArticle[] } };
    },

    /** Submit feedback */
    submitFeedback: async (data: {
      category: 'bug' | 'feature_request' | 'general' | 'help_chat';
      text: string;
      rating?: number;
      pageContext?: string;
    }) => {
      const response = await apiClient.post('/help/feedback', data);
      return response.data as { success: boolean; data: { id: string } };
    },
  },

  // -------- REELS --------
  reels: {
    // Transform functions for snake_case to camelCase
    _transformProject: (p: any): ReelProject => ({
      id: p.id,
      userId: p.user_id,
      contentKitId: p.content_kit_id,
      templateId: p.template_id,
      title: p.title,
      status: p.status,
      errorMessage: p.error_message,
      progress: p.progress,
      musicTrackId: p.music_track_id,
      musicVolume: p.music_volume,
      beatSyncEnabled: p.beat_sync_enabled,
      addCaptions: p.add_captions,
      captionPreset: p.caption_preset,
      // Transform generated_content (snake_case) to generatedContent (camelCase)
      generatedContent: p.generated_content ? {
        hookText: p.generated_content.hook_text,
        segmentOverlays: (p.generated_content.segment_overlays || []).map((o: any) => ({
          segmentId: o.segment_id,
          text: o.text,
          position: o.position,
        })),
        ctaText: p.generated_content.cta_text,
        captionScript: p.generated_content.caption_script,
        suggestedTemplate: p.generated_content.suggested_template,
        generatedAt: p.generated_content.generated_at,
      } : undefined,
      outputUrl: p.output_url,
      outputDurationMs: p.output_duration_ms,
      thumbnailUrl: p.thumbnail_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }),

    _transformClip: (c: any): ReelProjectClip => ({
      id: c.id,
      reelProjectId: c.reel_project_id,
      segmentId: c.segment_id,
      orderIndex: c.order_index,
      sourceUrl: c.source_url,
      sourceDurationMs: c.source_duration_ms,
      originalFilename: c.original_filename,
      thumbnailUrl: c.thumbnail_url,
      mediaType: c.media_type || 'video',
      motionEffect: c.motion_effect,
      displayDurationMs: c.display_duration_ms,
      trimStartMs: c.trim_start_ms,
      trimEndMs: c.trim_end_ms,
      transitionType: c.transition_type,
      effects: c.effects || [],
      status: c.status,
      localPath: c.local_path,
      errorMessage: c.error_message,
      createdAt: c.created_at,
    }),

    _transformMusicTrack: (t: any): MusicTrack => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      durationMs: t.duration_ms,
      fileUrl: t.file_url,
      tempo: t.tempo,
      beats: t.beats,
      downbeats: t.downbeats,
      genre: t.genre,
      mood: t.mood,
      isTrending: t.is_trending,
      licenseType: t.license_type,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }),

    _transformMusicTrackSummary: (t: any): MusicTrackSummary => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      durationMs: t.duration_ms,
      fileUrl: t.file_url,
      tempo: t.tempo,
      genre: t.genre,
      mood: t.mood,
      isTrending: t.is_trending,
      licenseType: t.license_type,
      createdAt: t.created_at,
    }),

    _transformRenderStatus: (s: any): ReelRenderStatus => ({
      status: s.status,
      progress: s.progress,
      errorMessage: s.error_message ?? s.errorMessage,
      outputUrl: s.output_url ?? s.outputUrl,
      thumbnailUrl: s.thumbnail_url ?? s.thumbnailUrl,
      outputDurationMs: s.output_duration_ms ?? s.outputDurationMs,
    }),

    _transformSegment: (s: any): TemplateSegment => ({
      id: s.id,
      label: s.label,
      order: s.order,
      defaultDurationMs: s.default_duration_ms,
      minDurationMs: s.min_duration_ms,
      maxDurationMs: s.max_duration_ms,
      transitionIn: s.transition_in,
      transitionOut: s.transition_out,
      effects: s.effects,
      textOverlay: s.text_overlay,
      description: s.description,
    }),

    _transformTemplate: (t: any): ReelTemplate => ({
      id: t.id,
      name: t.name,
      description: t.description,
      thumbnailUrl: t.thumbnail_url,
      category: t.category,
      segments: (t.segments || []).map(api.reels._transformSegment),
      defaultDurationMs: t.default_duration_ms,
      musicRequired: t.music_required,
      suggestedEffects: t.suggested_effects || [],
      bestFor: t.best_for || [],
      aspectRatio: t.aspect_ratio,
    }),

    // Templates
    /** List all reel templates */
    listTemplates: async () => {
      const response = await apiClient.get('/reels/templates', {
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any[]>;
      return {
        ...rawData,
        data: rawData.data?.map(api.reels._transformTemplate) || [],
      } as ApiResponse<ReelTemplate[]>;
    },

    /** Get template by ID */
    getTemplate: async (templateId: string) => {
      const response = await apiClient.get(`/reels/templates/${templateId}`, {
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformTemplate(rawData.data) : null,
      } as ApiResponse<ReelTemplate>;
    },

    // Music
    /** List music tracks */
    listMusic: async (params?: {
      genre?: string;
      mood?: string;
      trending?: boolean;
      limit?: number;
      offset?: number;
    }) => {
      const response = await apiClient.get('/reels/music', {
        params,
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any[]>;
      return {
        ...rawData,
        data: rawData.data?.map(api.reels._transformMusicTrackSummary) || [],
      } as ApiResponse<MusicTrackSummary[]>;
    },

    /** Get music track with beat data */
    getMusicTrack: async (trackId: string) => {
      const response = await apiClient.get(`/reels/music/${trackId}`, {
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformMusicTrack(rawData.data) : null,
      } as ApiResponse<MusicTrack>;
    },

    // Media Upload
    /** Upload a media file to Supabase storage for reels */
    uploadMedia: async (file: File, userId: string): Promise<{ url: string; path: string }> => {
      // Dynamic import to avoid SSR issues
      const { supabase } = await import('./supabase');

      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${userId}/reels/${fileName}`;

      const { data, error } = await supabase.storage
        .from('reels')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reels')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    },

    // Projects
    /** Create a new reel project */
    createProject: async (data: CreateReelProjectInput) => {
      const response = await apiClient.post('/reels/projects', data, {
        timeout: GENERATION_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformProject(rawData.data) : null,
      } as ApiResponse<ReelProject>;
    },

    /** List user's reel projects */
    listProjects: async (params?: {
      status?: ReelStatus;
      limit?: number;
      offset?: number;
    }) => {
      const response = await apiClient.get('/reels/projects', {
        params,
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any[]>;
      return {
        ...rawData,
        data: rawData.data?.map(api.reels._transformProject) || [],
      } as ApiResponse<ReelProject[]>;
    },

    /** Get project details with clips */
    getProject: async (projectId: string) => {
      const response = await apiClient.get(`/reels/projects/${projectId}`, {
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any>;
      if (!rawData.data) {
        return rawData as ApiResponse<ReelProjectDetail>;
      }
      return {
        ...rawData,
        data: {
          project: api.reels._transformProject(rawData.data.project),
          clips: (rawData.data.clips || []).map(api.reels._transformClip),
          template: rawData.data.template, // Already camelCase from templates.ts
          musicTrack: rawData.data.musicTrack ? api.reels._transformMusicTrack(rawData.data.musicTrack) : null,
        },
      } as ApiResponse<ReelProjectDetail>;
    },

    /** Update project settings */
    updateProject: async (projectId: string, data: UpdateReelProjectInput) => {
      const response = await apiClient.patch(`/reels/projects/${projectId}`, data);
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformProject(rawData.data) : null,
      } as ApiResponse<ReelProject>;
    },

    /** Update a clip within a project */
    updateClip: async (projectId: string, clipId: string, data: UpdateReelClipInput) => {
      const response = await apiClient.patch(
        `/reels/projects/${projectId}/clips/${clipId}`,
        data
      );
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformClip(rawData.data) : null,
      } as ApiResponse<ReelProjectClip>;
    },

    /** Delete a project */
    deleteProject: async (projectId: string) => {
      const response = await apiClient.delete(`/reels/projects/${projectId}`, {
        timeout: DELETE_TIMEOUT,
      });
      return response.data as ApiResponse<{ deleted: true }>;
    },

    /** Start rendering a project */
    renderProject: async (projectId: string) => {
      const response = await apiClient.post(`/reels/projects/${projectId}/render`, {}, {
        timeout: GENERATION_TIMEOUT,
      });
      return response.data as ApiResponse<{ status: 'processing'; projectId: string }>;
    },

    /** Get render status */
    getRenderStatus: async (projectId: string) => {
      const response = await apiClient.get(`/reels/projects/${projectId}/status`, {
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any>;
      return {
        ...rawData,
        data: rawData.data ? api.reels._transformRenderStatus(rawData.data) : null,
      } as ApiResponse<ReelRenderStatus>;
    },

    /** Poll render status until complete */
    pollRenderStatus: async (
      projectId: string,
      onProgress?: (status: ReelRenderStatus) => void,
      intervalMs: number = 2000,
      maxAttempts: number = 300 // 10 minutes max
    ): Promise<ReelRenderStatus> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;

        const poll = async () => {
          try {
            const response = await api.reels.getRenderStatus(projectId);
            const status = response.data;

            if (!status) {
              reject(new Error('No status data received'));
              return;
            }

            if (onProgress) {
              onProgress(status);
            }

            if (status.status === 'completed' || status.status === 'failed') {
              resolve(status);
              return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
              reject(new Error('Render polling timed out'));
              return;
            }

            setTimeout(poll, intervalMs);
          } catch (error) {
            reject(error);
          }
        };

        poll();
      });
    },
  },

  // -------- TEAM VOICES --------
  teamVoices: {
    list: async (): Promise<ApiResponse<TeamVoice[]>> => {
      const response = await apiClient.get('/team-voices');
      const raw = response.data as ApiResponse<Record<string, unknown>[]>;
      return {
        ...raw,
        data: raw.data ? raw.data.map(transformTeamVoice) : undefined,
      } as ApiResponse<TeamVoice[]>;
    },

    get: async (voiceId: string): Promise<ApiResponse<TeamVoice>> => {
      const response = await apiClient.get(`/team-voices/${voiceId}`);
      const raw = response.data as ApiResponse<Record<string, unknown>>;
      return {
        ...raw,
        data: raw.data ? transformTeamVoice(raw.data) : undefined,
      } as ApiResponse<TeamVoice>;
    },

    create: async (data: TeamVoiceInput): Promise<ApiResponse<TeamVoice>> => {
      const response = await apiClient.post('/team-voices', {
        name: data.name,
        description: data.description,
        avatar_url: data.avatarUrl,
        knowledge_base_id: data.knowledgeBaseId,
        profile_role: data.profileRole,
        profile_topics: data.profileTopics,
        profile_cta: data.profileCta,
        profile_guardrails: data.profileGuardrails,
        display_name: data.displayName,
        twitter_handle: data.twitterHandle,
        instagram_handle: data.instagramHandle,
        website_url: data.websiteUrl,
      });
      const raw = response.data as ApiResponse<Record<string, unknown>>;
      return {
        ...raw,
        data: raw.data ? transformTeamVoice(raw.data) : undefined,
      } as ApiResponse<TeamVoice>;
    },

    update: async (voiceId: string, data: Partial<TeamVoiceInput>): Promise<ApiResponse<TeamVoice>> => {
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
      if (data.knowledgeBaseId !== undefined) payload.knowledge_base_id = data.knowledgeBaseId;
      if (data.profileRole !== undefined) payload.profile_role = data.profileRole;
      if (data.profileTopics !== undefined) payload.profile_topics = data.profileTopics;
      if (data.profileCta !== undefined) payload.profile_cta = data.profileCta;
      if (data.profileGuardrails !== undefined) payload.profile_guardrails = data.profileGuardrails;
      if (data.displayName !== undefined) payload.display_name = data.displayName;
      if (data.twitterHandle !== undefined) payload.twitter_handle = data.twitterHandle;
      if (data.instagramHandle !== undefined) payload.instagram_handle = data.instagramHandle;
      if (data.websiteUrl !== undefined) payload.website_url = data.websiteUrl;

      const response = await apiClient.put(`/team-voices/${voiceId}`, payload);
      const raw = response.data as ApiResponse<Record<string, unknown>>;
      return {
        ...raw,
        data: raw.data ? transformTeamVoice(raw.data) : undefined,
      } as ApiResponse<TeamVoice>;
    },

    delete: async (voiceId: string): Promise<ApiResponse<{ message: string }>> => {
      const response = await apiClient.delete(`/team-voices/${voiceId}`);
      return response.data;
    },

    setDefault: async (voiceId: string): Promise<ApiResponse<TeamVoice>> => {
      const response = await apiClient.post(`/team-voices/${voiceId}/set-default`);
      const raw = response.data as ApiResponse<Record<string, unknown>>;
      return {
        ...raw,
        data: raw.data ? transformTeamVoice(raw.data) : undefined,
      } as ApiResponse<TeamVoice>;
    },

    getLimits: async (): Promise<ApiResponse<{ voiceCount: number; voiceLimit: number; tier: string }>> => {
      const response = await apiClient.get('/team-voices/limits');
      return response.data;
    },

    createDefault: async (): Promise<ApiResponse<TeamVoice>> => {
      const response = await apiClient.post('/team-voices/create-default');
      const raw = response.data as ApiResponse<Record<string, unknown>>;
      return {
        ...raw,
        data: raw.data ? transformTeamVoice(raw.data) : undefined,
      } as ApiResponse<TeamVoice>;
    },
  },

  // -------- B-ROLL --------
  broll: {
    _transform: (b: any): import('../types').AIGeneratedBRoll => ({
      id: b.id,
      userId: b.user_id,
      contentKitId: b.content_kit_id,
      klingTaskId: b.kling_task_id,
      prompt: b.prompt,
      sourceType: b.source_type,
      status: b.status,
      videoUrl: b.video_url,
      thumbnailUrl: b.thumbnail_url,
      durationSeconds: b.duration_seconds,
      aspectRatio: b.aspect_ratio || '9:16',
      costCents: b.cost_cents,
      errorMessage: b.error_message,
      createdAt: b.created_at,
      completedAt: b.completed_at,
    }),

    /** Generate AI B-roll via Kling */
    generate: async (data: import('../types').BRollGenerateInput) => {
      const response = await apiClient.post('/broll/generate', {
        content_kit_id: data.contentKitId,
        prompt: data.prompt,
        source_image_url: data.sourceImageUrl,
        duration: data.duration,
        aspect_ratio: data.aspectRatio || '9:16',
      }, { timeout: GENERATION_TIMEOUT });
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? api.broll._transform(raw.data) : null,
      } as ApiResponse<import('../types').AIGeneratedBRoll>;
    },

    /** Get B-roll generation status */
    getStatus: async (id: string) => {
      const response = await apiClient.get(`/broll/${id}/status`, { timeout: LIST_TIMEOUT });
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? api.broll._transform(raw.data) : null,
      } as ApiResponse<import('../types').AIGeneratedBRoll>;
    },

    /** List user's B-roll clips */
    list: async (params?: { limit?: number; offset?: number }) => {
      const response = await apiClient.get('/broll', { params, timeout: LIST_TIMEOUT });
      const raw = response.data as ApiResponse<any[]>;
      return {
        ...raw,
        data: raw.data?.map(api.broll._transform) || [],
      } as ApiResponse<import('../types').AIGeneratedBRoll[]>;
    },

    /** Delete a B-roll clip */
    delete: async (id: string) => {
      const response = await apiClient.delete(`/broll/${id}`, { timeout: DELETE_TIMEOUT });
      return response.data as ApiResponse<{ deleted: true }>;
    },

    /** Poll B-roll generation until complete */
    pollStatus: async (
      id: string,
      onProgress?: (broll: import('../types').AIGeneratedBRoll) => void,
      intervalMs: number = 5000,
      maxAttempts: number = 200 // ~16 minutes max
    ): Promise<import('../types').AIGeneratedBRoll> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const poll = async () => {
          try {
            const response = await api.broll.getStatus(id);
            const data = response.data;
            if (!data) { reject(new Error('No status data')); return; }
            if (onProgress) onProgress(data);
            if (data.status === 'completed' || data.status === 'failed') {
              resolve(data);
              return;
            }
            attempts++;
            if (attempts >= maxAttempts) { reject(new Error('B-roll generation timed out')); return; }
            setTimeout(poll, intervalMs);
          } catch (error) { reject(error); }
        };
        poll();
      });
    },
  },

  // -------- B-ROLL REEL COMPOSITION --------
  brollReels: {
    /** Fetch B-roll clip library, optionally filtered by category */
    getBRollLibrary: async (category?: string) => {
      const response = await apiClient.get('/reels/broll-library', {
        params: category ? { category } : undefined,
        timeout: LIST_TIMEOUT,
      });
      // Backend returns { success, data: { categories, clips } } — unwrap the envelope
      const envelope = response.data as { success: boolean; data: { categories: string[]; clips: Array<{ id: string; url: string; thumbnailUrl: string; category: string; label?: string }> } };
      return envelope.data;
    },

    /** Get the first reel project for a given content kit */
    getByKitId: async (kitId: string) => {
      const response = await apiClient.get('/reels/projects', {
        params: { content_kit_id: kitId, limit: 1 },
        timeout: LIST_TIMEOUT,
      });
      const rawData = response.data as ApiResponse<any[]>;
      const projects = rawData.data?.map(api.reels._transformProject) || [];
      return projects[0] || null;
    },

    /** Compose a B-roll reel with text overlays — returns project ID for polling */
    compose: async (data: import('../types').ComposeBRollReelInput) => {
      const response = await apiClient.post('/reels/compose-broll', {
        broll_clip_ids: data.brollClipIds,
        template_style: data.templateStyle,
        content_kit_id: data.contentKitId,
        music_track_id: data.musicTrackId,
        generate_text: data.generateText,
        topic: data.topic,
        text_overlays: data.textOverlays,
      }, { timeout: GENERATION_TIMEOUT });
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? {
          projectId: raw.data.project_id || raw.data.projectId,
          status: raw.data.status,
        } : null,
      } as ApiResponse<import('../types').ComposeBRollReelResponse>;
    },

    /** Get text overlay style definitions */
    getStyles: async () => {
      const response = await apiClient.get('/reels/text-overlay-styles', { timeout: LIST_TIMEOUT });
      return response.data as ApiResponse<import('../types').TextOverlayStyle[]>;
    },

    /** Preview AI-generated text overlays without starting a render */
    previewTextOverlays: async (data: { topic: string; clipCount: number }) => {
      const response = await apiClient.post('/reels/preview-text-overlays', {
        topic: data.topic,
        clip_count: data.clipCount,
      }, { timeout: GENERATION_TIMEOUT });
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? {
          overlays: raw.data.overlays as Array<{ text: string; position: string }>,
        } : null,
      } as ApiResponse<{ overlays: Array<{ text: string; position: string }> }>;
    },
  },

  // -------- CURATED ASSETS --------
  curatedAssets: {
    _transform: (a: any): import('../types').CuratedAsset => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      category: a.category,
      niche: a.niche,
      month: a.month,
      year: a.year,
      mediaUrl: a.media_url,
      content: a.content,
      thumbnailUrl: a.thumbnail_url,
      minTier: a.min_tier || 'free',
      isActive: a.is_active,
      sortOrder: a.sort_order,
      createdAt: a.created_at,
    }),

    /** List curated assets (with filters) */
    list: async (params?: {
      type?: import('../types').CuratedAssetType;
      category?: string;
      month?: number;
      year?: number;
      limit?: number;
      offset?: number;
    }) => {
      const response = await apiClient.get('/curated-assets', { params, timeout: LIST_TIMEOUT });
      const raw = response.data as ApiResponse<any[]>;
      return {
        ...raw,
        data: raw.data?.map(api.curatedAssets._transform) || [],
      } as ApiResponse<import('../types').CuratedAsset[]>;
    },

    /** Create curated asset (admin) */
    create: async (data: import('../types').CuratedAssetInput) => {
      const response = await apiClient.post('/curated-assets', {
        type: data.type,
        title: data.title,
        description: data.description,
        category: data.category,
        niche: data.niche,
        month: data.month,
        year: data.year,
        media_url: data.mediaUrl,
        content: data.content,
        thumbnail_url: data.thumbnailUrl,
        min_tier: data.minTier || 'free',
        sort_order: data.sortOrder || 0,
      });
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? api.curatedAssets._transform(raw.data) : null,
      } as ApiResponse<import('../types').CuratedAsset>;
    },

    /** Update curated asset (admin) */
    update: async (id: string, data: Partial<import('../types').CuratedAssetInput>) => {
      const payload: Record<string, unknown> = {};
      if (data.type !== undefined) payload.type = data.type;
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.category !== undefined) payload.category = data.category;
      if (data.niche !== undefined) payload.niche = data.niche;
      if (data.month !== undefined) payload.month = data.month;
      if (data.year !== undefined) payload.year = data.year;
      if (data.mediaUrl !== undefined) payload.media_url = data.mediaUrl;
      if (data.content !== undefined) payload.content = data.content;
      if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
      if (data.minTier !== undefined) payload.min_tier = data.minTier;
      if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
      const response = await apiClient.patch(`/curated-assets/${id}`, payload);
      const raw = response.data as ApiResponse<any>;
      return {
        ...raw,
        data: raw.data ? api.curatedAssets._transform(raw.data) : null,
      } as ApiResponse<import('../types').CuratedAsset>;
    },

    /** Delete curated asset (admin) */
    delete: async (id: string) => {
      const response = await apiClient.delete(`/curated-assets/${id}`, { timeout: DELETE_TIMEOUT });
      return response.data as ApiResponse<{ deleted: true }>;
    },

    /** Bulk create curated assets (admin) */
    bulkCreate: async (assets: import('../types').CuratedAssetInput[]) => {
      const response = await apiClient.post('/curated-assets/bulk', {
        assets: assets.map(a => ({
          type: a.type,
          title: a.title,
          description: a.description,
          category: a.category,
          niche: a.niche,
          month: a.month,
          year: a.year,
          media_url: a.mediaUrl,
          content: a.content,
          thumbnail_url: a.thumbnailUrl,
          min_tier: a.minTier || 'free',
          sort_order: a.sortOrder || 0,
        })),
      });
      return response.data as ApiResponse<{ created: number }>;
    },
  },

  // -------- DESCRIPT STUDIO --------
  descript: {
    createProject: async (data: { title: string; source: DescriptCreateSource }) => {
      const response = await apiClient.post('/descript/projects', data);
      return response.data as { project: DescriptProject; job: DescriptJob };
    },

    listProjects: async (params?: { limit?: number; offset?: number; status?: string }) => {
      const response = await apiClient.get('/descript/projects', { params });
      return response.data as DescriptProject[];
    },

    getProject: async (id: string) => {
      const response = await apiClient.get(`/descript/projects/${id}`);
      return response.data as { project: DescriptProject; jobs: DescriptJob[] };
    },

    runEdit: async (projectId: string, data: { prompt: string; model?: string }) => {
      const response = await apiClient.post(`/descript/projects/${projectId}/edit`, data);
      return response.data as { job: DescriptJob };
    },

    pollJobStatus: async (jobId: string) => {
      const response = await apiClient.get(`/descript/jobs/${jobId}/status`);
      return response.data as DescriptJob;
    },

    deleteProject: async (id: string) => {
      const response = await apiClient.delete(`/descript/projects/${id}`);
      return response.data as { deleted: boolean };
    },
  },
};

// -------- TEAM VOICE TYPES --------

export interface TeamVoice {
  id: string;
  userId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  knowledgeBaseId?: string;
  profileRole?: string;
  profileTopics?: string;
  profileCta?: string;
  profileGuardrails?: string;
  displayName?: string;
  twitterHandle?: string;
  instagramHandle?: string;
  websiteUrl?: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamVoiceInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  knowledgeBaseId?: string;
  profileRole?: string;
  profileTopics?: string;
  profileCta?: string;
  profileGuardrails?: string;
  displayName?: string;
  twitterHandle?: string;
  instagramHandle?: string;
  websiteUrl?: string;
}

// -------- ADMIN USAGE TYPES --------

export interface AdminUsageOverview {
  month: string;
  totalSpend: number;
  totalTokens: number;
  totalRequests: number;
  activeUsers: number;
  spendByService: AdminServiceBreakdown[];
}

export interface AdminServiceBreakdown {
  service: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface AdminUserBreakdown {
  userId: string;
  email: string | null;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface AdminDailyTrend {
  date: string;
  service: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface AdminBusinessMetrics {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  tierBreakdown: { tier: string; count: number; mrr: number }[];
  totalUsers: number;
  freeUsers: number;
  trialSubscribers: { email: string; tier: string; trialEnd: string; daysRemaining: number; source: 'stripe' | 'admin' }[];
  conversionRate: number | null;
  convertedCount: number;
  canceledTrialCount: number;
}

export interface AdminUserSegment {
  name: string;
  description: string;
  count: number;
  users: { email: string; fullName: string | null; createdAt: string; lastActiveAt: string | null; generationCount: number }[];
}

export interface AdminSegmentationData {
  segments: AdminUserSegment[];
  totalUsers: number;
  lastUpdated: string;
}

export interface AdminErrorHealth {
  status: 'green' | 'yellow' | 'red';
  counts: { last1h: number; last24h: number; last7d: number };
  recentErrors: { id: string; error_message: string; error_type: string; endpoint: string; created_at: string }[];
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  summary: string;
}

// Types for creator monitoring
export interface MonitoredCreator {
  id: string;
  user_id: string;
  platform: 'youtube' | 'instagram';
  creator_url: string;
  creator_name?: string;
  creator_username?: string;
  creator_avatar_url?: string;
  channel_id?: string;
  automation_enabled: boolean;
  polling_interval_seconds: number;
  next_check_at: string;
  last_checked_at?: string;
  total_checks: number;
  successful_checks: number;
  new_content_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentHistoryEntry {
  id: string;
  creator_id: string;
  user_id: string;
  platform: string;
  content_url: string;
  content_id?: string;
  title?: string;
  description?: string;
  transcript?: string;
  summary?: string;
  summary_generated_at?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  view_count?: number;
  published_at?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  repurpose_status: 'pending' | 'generating' | 'completed' | 'skipped';
  is_new_content: boolean;
  auto_repurpose: boolean;
  user_reviewed: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'off';
  email_new_content: boolean;
  email_repurpose_complete: boolean;
  sms_enabled: boolean;
  sms_phone?: string;
  sms_new_content: boolean;
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export interface RepurposeSuggestion {
  id: string;
  contentHistoryId: string;
  suggestedAngle: string;
  suggestedPlatforms: string[];
  keyIdeas: string[];
  differentiationNotes: string;
  relevanceScore: number;
  originalityPotential: number;
}

export interface RepurposeResult {
  // Common fields
  requestId: string; // ID of the generation_request record (for Content Kit)
  contentHistoryId: string;
  error?: string;

  // Async response fields
  status?: 'processing' | 'completed' | 'failed';

  // Sync response fields (legacy - when content is returned immediately)
  success?: boolean;
  generatedContent?: {
    results: Array<{
      platform: string;
      content: string;
    }>;
  } | null;
  extractedIdeas?: string[];
  originalTitle?: string;
}

// Types for clip finder
export interface VideoUpload {
  id: string;
  userId: string;
  knowledgeBaseId?: string;
  sourceType: 'upload' | 'youtube' | 'instagram' | 'url' | 'loom' | 'zoom';
  sourceUrl?: string;
  originalFilename?: string;
  storagePath?: string;
  storageBucket?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  status: 'pending' | 'uploading' | 'transcribing' | 'analyzing' | 'extracting' | 'captioning' | 'generating' | 'completed' | 'failed';
  statusMessage?: string;
  errorCode?: string;
  progressPercent: number;
  transcriptText?: string;
  transcriptSegments?: TranscriptSegment[];
  transcriptLanguage?: string;
  minutesUsed: number;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  deletedAt?: string;
  thumbnailUrl?: string;
  // Mux Video (when using Mux for ingest)
  muxUploadId?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxMp4Url?: string;
  contentKitTitle?: string; // Smart title from linked content kit
  platforms?: string[]; // Platforms with content from linked content kit
}

export interface VideoClip {
  id: string;
  userId: string;
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
  captionStyle: 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight' | 'karaoke' | 'underline' | 'word_by_word';
  captionConfig?: Record<string, unknown>;
  hasCaptions: boolean;
  captionsBurnedIn: boolean;
  captionUrl?: string;
  captionPosition?: 'bottom' | 'center' | 'top';
  exports: ClipExport[];
  thumbnailPath?: string;
  thumbnailUrl?: string;
  srtPath?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sortOrder: number;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
}

export interface ClipExport {
  format: 'portrait' | 'landscape' | 'square';
  quality: '720p' | '1080p' | '4k';
  storagePath: string;
  url: string;
  fileSizeBytes?: number;
}

export interface ContentKit {
  id: string;
  userId: string;
  videoUploadId: string;
  knowledgeBaseId?: string;
  title: string;
  description?: string;
  contentLinkedin?: string;
  contentTwitter?: string;
  contentInstagram?: string;
  contentBlog?: string;
  contentEmail?: string;
  contentTiktok?: string;
  contentYoutube?: string;
  contentVideoScript?: string;
  generationRequestId?: string;
  voiceSamplesUsed?: unknown;
  clipsGenerated: number;
  contentGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Slim content kit for list views — boolean platform flags instead of full content text */
export interface ContentKitListItem {
  id: string;
  userId: string;
  videoUploadId: string;
  title: string;
  description?: string;
  hasLinkedin: boolean;
  hasTwitter: boolean;
  hasInstagram: boolean;
  hasBlog: boolean;
  hasEmail: boolean;
  hasTiktok: boolean;
  hasYoutube: boolean;
  hasVideoScript: boolean;
  generationRequestId?: string;
  voiceId?: string;
  clipsGenerated: number;
  contentGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  video_uploads?: {
    id: string;
    original_filename: string;
    duration_seconds: number;
    status: string;
  };
}

export interface ClipJob {
  id: string;
  userId: string;
  videoUploadId: string;
  jobType: 'full_process' | 'transcribe' | 'extract_clips' | 'add_captions' | 'export' | 'generate_content';
  config: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progressPercent: number;
  currentStep?: string;
  stepsCompleted: string[];
  result?: Record<string, unknown>;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
}

export interface VideoSnapshot {
  id: string;
  userId: string;
  videoUploadId: string;
  timeOffsetSeconds: number;
  storagePath: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

// ============================================
// STRIPE / BILLING TYPES
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'studio' | 'enterprise' | 'teams_2' | 'teams_5' | 'teams_10';
export type BillingInterval = 'month' | 'year';
export type PlanId = 'echo' | 'echo-studio' | 'echo-pro' | 'echo-teams-2' | 'echo-teams-5' | 'echo-teams-10';

export interface StripePlan {
  id: PlanId;
  name: string;
  tier: SubscriptionTier;
  monthlyPriceId: string;
  annualPriceId: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limits: {
    videoMinutesPerMonth: number;
    clipsPerVideo: number;
    knowledgeBases: number;
    creatorRadar: number;
    exportQuality: string;
    emailImportMaxEmails: number;
    maxVoices?: number;
  };
  trialDays?: number;
}

export interface StripePlansResponse {
  success: boolean;
  data: {
    plans: StripePlan[];
  };
}

export interface StripeSubscriptionStatus {
  isSubscribed: boolean;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | null;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string;
  isAdminAssigned?: boolean;
  freeGenerationsUsed?: number;
  freeGenerationsLimit?: number;
}

export interface StripeSubscriptionResponse {
  success: boolean;
  data: StripeSubscriptionStatus;
}

export interface StripeCheckoutResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

export interface StripePortalResponse {
  success: boolean;
  data: {
    url: string;
  };
}

export interface StripeUsageLimits {
  generationsPerMonth: number;
  knowledgeBases: number;
  monitoredCreators: number;
  videoMinutesPerMonth: number;
  clipsPerVideo: number;
  exportQuality: string;
  emailImportMaxEmails: number;
}

export interface StripeUsageLimitsResponse {
  success: boolean;
  data: {
    userId: string;
    tier: SubscriptionTier;
    currentMonth: string;
    generationsUsed: number;
    generationsLimit: number;
    generationsRemaining: number;
    tokensUsed: number;
    costUsd: number;
    isUnlimited: boolean;
    videoMinutesUsed: number;
    videoMinutesLimit: number;
    videoMinutesRemaining: number;
    clipsGenerated: number;
    contentKitsCreated: number;
  };
}

// ============================================
// TRENDS TYPES
// ============================================

export type TrendPlatform = 'tiktok' | 'instagram' | 'youtube_shorts';
export type TrendLifecycleStatus = 'emerging' | 'peaking' | 'declining' | 'archived';
export type TrendAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type TrendGenerationStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type TrendContentType = 'video' | 'static' | 'carousel';
export type TrendVisualStyle = 'talking_head' | 'b_roll' | 'screen_share' | 'mixed' | 'text_overlay';
export type TrendPacing = 'fast' | 'medium' | 'slow';

export interface Trend {
  id: string;
  source_url: string;
  source_platform: TrendPlatform;
  normalized_url: string;
  content_id: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  view_count?: number;
  like_count?: number;
  share_count?: number;
  analysis_status: TrendAnalysisStatus;
  lifecycle_status: TrendLifecycleStatus;
  is_curated: boolean;
  curator_notes?: string;
  niche?: string;
  tags?: string[];
  submitted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrendAnalysis {
  id: string;
  trend_id: string;
  content_type: TrendContentType;
  hook_type?: string;
  hook_text?: string;
  hook_duration_seconds?: number;
  visual_style?: TrendVisualStyle | { format?: string; camera_work?: string[]; transitions?: string[]; color_grading?: string; text_overlays?: Record<string, string> };
  pacing?: TrendPacing | { tempo?: string; cut_frequency?: string; rhythm_pattern?: string };
  format_structure?: {
    type: string;
    segments: Array<{
      name: string;
      startSeconds: number;
      endSeconds: number;
      description?: string;
    }>;
  };
  audio_type?: string;
  has_voiceover?: boolean;
  has_music?: boolean;
  cta_type?: string;
  cta_text?: string;
  transcript?: string;
  key_elements?: string[];
  why_it_works?: string;
  created_at: string;
}

export interface TrendWithAnalysis extends Trend {
  analysis?: TrendAnalysis;
}

export interface TrendCreativeBrief {
  id: string;
  trend_id: string;
  analysis_id: string;
  script_template?: string;
  shot_list?: TrendShotListItem[];
  audio_recommendations?: {
    type: string;
    suggestions: string[];
    mood?: string;
  };
  editing_notes?: string[];
  recreation_checklist?: Array<{ item: string; required: boolean }>;
  niche_adaptations?: Record<string, { hook_example?: string; script_variation?: string }>;
  created_at: string;
}

export interface TrendShotListItem {
  shot_number: number;
  start_seconds: number;
  end_seconds: number;
  description: string;
  camera?: string;
  action?: string;
  text_overlay?: string;
}

export interface TrendCopy {
  id: string;
  user_id: string;
  trend_id: string;
  creative_brief_id?: string;
  customized_script?: string;
  customized_shot_list?: TrendShotListItem[];
  selected_niche?: string;
  user_notes?: string;
  generation_status: TrendGenerationStatus;
  generation_request_id?: string;
  generated_content_id?: string;
  generation_error?: string;
  created_at: string;
  updated_at: string;
}

export interface TrendCopyWithTrend extends TrendCopy {
  trend?: Trend;
  creative_brief?: TrendCreativeBrief;
}

// -------- TREND DISCOVERY TYPES --------

export interface TrendingReel {
  id: string;
  title: string;
  platform: string;
  audio_name?: string;
  audio_artist?: string;
  category?: string;
  use_case?: string;
  script_template?: string;
  caption_template?: string;
  hashtags?: string[];
  source_url?: string;
  discovery_metadata?: Record<string, unknown>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export type TrendUserReelStatus = 'generating' | 'ready' | 'failed';

export interface TrendUserReel {
  id: string;
  user_id: string;
  trending_reel_id: string;
  status: TrendUserReelStatus;
  broll_asset_id?: string;
  broll_url?: string;
  overlay_texts?: string[];
  generated_caption?: string;
  output_url?: string;
  output_storage_path?: string;
  descript_project_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  trending_reels?: TrendingReel;
}

// -------- DESCRIPT STUDIO TYPES --------

export type DescriptProjectStatus = 'creating' | 'ready' | 'editing' | 'failed';
export type DescriptJobType = 'import' | 'agent_edit';
export type DescriptJobStatusValue = 'running' | 'stopped' | 'cancelled' | 'failed';

export interface DescriptProject {
  id: string;
  user_id: string;
  descript_project_id?: string;
  title: string;
  project_url?: string;
  status: DescriptProjectStatus;
  source_type: 'clips' | 'urls';
  source_metadata?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DescriptJob {
  id: string;
  project_id: string;
  user_id: string;
  descript_job_id: string;
  job_type: DescriptJobType;
  status: DescriptJobStatusValue;
  prompt?: string;
  model?: string;
  progress_label?: string;
  result_data?: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type DescriptCreateSource =
  | { type: 'clips'; clipIds: string[] }
  | { type: 'urls'; urls: string[] };

export default api;
