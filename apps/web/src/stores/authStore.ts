import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  patient?: { id: string; primaryCondition: string; engagementLevel: string; riskScore: number };
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'rastera-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
