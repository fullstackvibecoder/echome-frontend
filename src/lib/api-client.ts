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
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

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
        payload
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
};

export default api;
