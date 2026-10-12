import { create } from "zustand";
import { persist } from "zustand/middleware";

import { loginRequest } from "@/lib/auth";
import type { AuthUser, LoginCredentials } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await loginRequest(credentials);
          set({ user, token, isLoading: false });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Gagal masuk. Coba lagi.";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: () => set({ user: null, token: null, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "idt-ai-auth",
      // Hanya simpan sesi (bukan status loading/error) di localStorage.
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
