import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
  DEMO_MODE_KEY, DEMO_DASHBOARD, DEMO_LEARNING_PLAN, DEMO_VITALS,
  DEMO_CHAT_SESSIONS, DEMO_NEW_SESSION, DEMO_CHAT_RESPONSES,
  getDemoModule,
} from './demoData';

export { DEMO_MODE_KEY };

// ── Demo adapter ──────────────────────────────────────────────────────────────
// Replaces the HTTP adapter when demo mode is active — returns mock data
// without making any network requests.

function mockResponse(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return {
    data: { data, success: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
}

async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  if (url.includes('/patients/') && url.includes('/dashboard')) {
    return mockResponse(config, DEMO_DASHBOARD);
  }
  if (url.includes('/learning-plans/')) {
    return mockResponse(config, DEMO_LEARNING_PLAN);
  }
  const moduleMatch = /\/modules\/([^?/]+)/.exec(url);
  if (moduleMatch && method === 'get') {
    return mockResponse(config, getDemoModule(moduleMatch[1]));
  }
  if (url.includes('/vitals/') && method === 'get') {
    return mockResponse(config, DEMO_VITALS);
  }
  if (url.endsWith('/vitals') && method === 'post') {
    return mockResponse(config, { id: 'demo-vital-new' });
  }
  if (url.endsWith('/chat/sessions') && method === 'get') {
    return mockResponse(config, DEMO_CHAT_SESSIONS);
  }
  if (url.endsWith('/chat/sessions') && method === 'post') {
    return mockResponse(config, DEMO_NEW_SESSION);
  }
  if (url.includes('/chat/sessions/') && !url.includes('/messages') && method === 'get') {
    const sid = url.split('/chat/sessions/')[1];
    return mockResponse(config, { id: sid, messages: (globalThis as any).__demoMessages || [] });
  }
  if (url.includes('/chat/sessions/') && url.includes('/messages') && method === 'post') {
    const body = JSON.parse(config.data || '{}');
    const userMsg = { id: `u-${Date.now()}`, role: 'USER', content: body.message, createdAt: new Date().toISOString() };
    const botMsg = { id: `b-${Date.now()}`, role: 'ASSISTANT', content: DEMO_CHAT_RESPONSES.default, createdAt: new Date().toISOString() };
    const prev: any[] = (globalThis as any).__demoMessages || [];
    (globalThis as any).__demoMessages = [...prev, userMsg, botMsg];
    return mockResponse(config, { message: botMsg });
  }
  if (url.includes('/progress/') && url.includes('/start')) {
    return mockResponse(config, { started: true });
  }
  if (url.includes('/progress/') && url.includes('/complete')) {
    return mockResponse(config, { passed: true, score: 90, feedback: 'Excellent work! You clearly understood the key points of this lesson.' });
  }
  return mockResponse(config, {});
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token; override adapter when demo mode is active
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== 'undefined' && sessionStorage.getItem(DEMO_MODE_KEY) === '1') {
    config.adapter = demoAdapter;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Refresh user profile so patient.id and role are always current
        try {
          const me = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          useAuthStore.getState().setUser(me.data.data);
        } catch {}
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
