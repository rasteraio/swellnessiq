import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
  DEMO_MODE_KEY, DEMO_DASHBOARD, DEMO_LEARNING_PLAN, DEMO_VITALS,
  DEMO_CHAT_SESSIONS, DEMO_NEW_SESSION, DEMO_CHAT_RESPONSES,
  getDemoModule,
} from './demoData';

export { DEMO_MODE_KEY };

function matchPath(url: string, pattern: RegExp) {
  return pattern.exec(url);
}

function demoResponse(data: any) {
  return Promise.resolve({ data: { data, success: true }, status: 200, statusText: 'OK', headers: {}, config: {} as any });
}

async function demoAdapter(config: InternalAxiosRequestConfig): Promise<any> {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // Dashboard
  if (url.includes('/patients/') && url.includes('/dashboard')) {
    return demoResponse(DEMO_DASHBOARD);
  }
  // Learning plan
  if (url.includes('/learning-plans/')) {
    return demoResponse(DEMO_LEARNING_PLAN);
  }
  // Individual module
  const moduleMatch = matchPath(url, /\/modules\/([^?/]+)/);
  if (moduleMatch && method === 'get') {
    return demoResponse(getDemoModule(moduleMatch[1]));
  }
  // Vitals
  if (url.includes('/vitals/')) {
    return demoResponse(DEMO_VITALS);
  }
  // Log vital (POST)
  if (url.endsWith('/vitals') && method === 'post') {
    return demoResponse({ id: 'demo-vital-new' });
  }
  // Chat sessions list
  if (url.endsWith('/chat/sessions') && method === 'get') {
    return demoResponse(DEMO_CHAT_SESSIONS);
  }
  // Create chat session
  if (url.endsWith('/chat/sessions') && method === 'post') {
    return demoResponse(DEMO_NEW_SESSION);
  }
  // Get chat session
  if (url.includes('/chat/sessions/') && !url.includes('/messages') && method === 'get') {
    const sid = url.split('/chat/sessions/')[1];
    return demoResponse({ id: sid, messages: (globalThis as any).__demoMessages || [] });
  }
  // Send chat message
  if (url.includes('/chat/sessions/') && url.includes('/messages') && method === 'post') {
    const body = JSON.parse(config.data || '{}');
    const userMsg = { id: `u-${Date.now()}`, role: 'USER', content: body.message, createdAt: new Date().toISOString() };
    const botMsg = { id: `b-${Date.now()}`, role: 'ASSISTANT', content: DEMO_CHAT_RESPONSES.default, createdAt: new Date().toISOString() };
    const prev = (globalThis as any).__demoMessages || [];
    (globalThis as any).__demoMessages = [...prev, userMsg, botMsg];
    return demoResponse({ message: botMsg });
  }
  // Module start/complete
  if (url.includes('/progress/') && url.includes('/start')) {
    return demoResponse({ started: true });
  }
  if (url.includes('/progress/') && url.includes('/complete')) {
    return demoResponse({ passed: true, score: 90, feedback: 'Excellent work! You clearly understood the key points of this lesson.' });
  }

  return demoResponse({});
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token + intercept demo mode
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== 'undefined' && sessionStorage.getItem(DEMO_MODE_KEY) === '1') {
    const result = await demoAdapter(config);
    // Signal response interceptor to pass this through
    (config as any).__demoResult = result;
    // Throw a cancel-like object carrying the response
    const cancel = new axios.Cancel('__demo__');
    (cancel as any).__demoResult = result;
    throw cancel;
  }
  return config;
});

// Auto-refresh token on 401 + handle demo mode pass-through
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Demo mode: return the pre-built mock response
    if (axios.isCancel(error) && (error as any).__demoResult) {
      return (error as any).__demoResult;
    }
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
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
