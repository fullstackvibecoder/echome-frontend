/**
 * API Client
 * Axios-based client for backend communication
 */

import axios, { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  GenerationRequest,
  KnowledgeBase,
  SocialIntegration,
  GeneratedImage,
  GeneratedCarousel,
  ImageGenerationOptions,
  BackgroundConfig,
  BackgroundPreset,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance with default timeout
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds default
});

// Extended timeout for long-running operations like content generation
const GENERATION_TIMEOUT = 90000; // 90 seconds for AI generation

// Request interceptor - add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
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
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// API FUNCTIONS
// ============================================

export const api = {
  // -------- AUTH --------
  auth: {
    signup: async (email: string, password: string, name: string) => {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        name,
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
    },

    getCurrentUser: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
  },

  // -------- CONTENT GENERATION --------
  generation: {
    generate: async (data: Partial<GenerationRequest>) => {
      // Transform camelCase to snake_case for API
      const payload = {
        input_type: data.inputType,
        input_text: data.inputText,
        input_audio_path: data.inputAudioPath,
        input_video_path: data.inputVideoPath,
        knowledge_base_id: data.knowledgeBaseId,
        platforms: data.platforms,
        tone: data.tone,
        additional_instructions: data.additionalInstructions,
        use_tll_validator: data.useTllValidator,
      };

      const response = await apiClient.post<ApiResponse<GenerationRequest>>(
        '/generate',
        payload,
        { timeout: GENERATION_TIMEOUT }
      );
      return response.data;
    },

    getRequest: async (id: string) => {
      const response = await apiClient.get<ApiResponse<GenerationRequest>>(
        `/generate/${id}`
      );
      return response.data;
    },

    listRequests: async (params?: { limit?: number; offset?: number }) => {
      const response = await apiClient.get<
        ApiResponse<GenerationRequest[]>
      >('/generate', { params });
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

    create: async (name: string) => {
      const response = await apiClient.post<ApiResponse<KnowledgeBase>>(
        '/kb',
        { name }
      );
      return response.data;
    },

    delete: async (id: string) => {
      const response = await apiClient.delete<ApiResponse>(`/kb/${id}`);
      return response.data;
    },
  },

  // -------- FILE UPLOADS --------
  files: {
    upload: async (kbId: string, file: File, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/files/upload?kbId=${kbId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );
      return response.data;
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
      const response = await apiClient.delete(`/kb/content/${contentId}`);
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
    /** Upload and ingest MBOX email archive */
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
      platform: 'youtube' | 'instagram';
      url: string;
      knowledgeBaseId?: string;
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
        config?: {
          primaryColor?: string;
          accentColor?: string;
          textColor?: string;
          backgroundColor?: string;
        };
        contentSummary?: string;
      }
    ) => {
      const response = await apiClient.post<ApiResponse<{ carousel: GeneratedCarousel }>>(
        '/images/carousel',
        {
          contentId,
          slides,
          background: options?.background,
          config: options?.config,
          contentSummary: options?.contentSummary,
        },
        { timeout: 120000 } // 2 minutes for carousel generation
      );
      return response.data;
    },

    generateCarouselWithUpload: async (
      contentId: string,
      slides: Array<{ text: string; type?: string }>,
      backgroundImage: File,
      options?: {
        config?: Record<string, string>;
        overlay?: { color: string; opacity: number };
      }
    ) => {
      const formData = new FormData();
      formData.append('backgroundImage', backgroundImage);
      formData.append('contentId', contentId);
      formData.append('slides', JSON.stringify(slides));
      if (options?.config) {
        formData.append('config', JSON.stringify(options.config));
      }
      if (options?.overlay) {
        formData.append('overlay', JSON.stringify(options.overlay));
      }

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
        config?: Record<string, string>;
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
          config: options?.config,
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
        `/images/carousel/${contentId}`
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
};

export default api;
