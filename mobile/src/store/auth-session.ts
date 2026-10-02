import { create } from 'zustand';

import { getAccessToken } from '@/services/storage/auth-storage';

type AuthStatus = 'checking' | 'authenticated' | 'guest';

type AuthSessionStore = {
  status: AuthStatus;
  hydrate: () => Promise<void>;
  setAuthenticated: () => void;
  setGuest: () => void;
};

export const useAuthSessionStore = create<AuthSessionStore>((set) => ({
  status: 'checking',

  hydrate: async () => {
    try {
      const accessToken = await getAccessToken();

      set({
        status: accessToken ? 'authenticated' : 'guest',
      });
    } catch {
      set({
        status: 'guest',
      });
    }
  },

  setAuthenticated: () =>
    set({
      status: 'authenticated',
    }),

  setGuest: () =>
    set({
      status: 'guest',
    }),
}));
