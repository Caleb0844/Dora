import { create } from 'zustand';

export type AuthIntent =
  | {
      type: 'route';
      route: '/add' | '/profile';
    }
  | {
      type: 'bookmark';
      placeId: string;
    }
  | {
      type: 'explore';
      placeId: string;
    };

type AuthIntentStore = {
  intent: AuthIntent | null;
  setIntent: (intent: AuthIntent) => void;
  clearIntent: () => void;
};

export const useAuthIntentStore = create<AuthIntentStore>((set) => ({
  intent: null,

  setIntent: (intent) => set({ intent }),

  clearIntent: () => set({ intent: null }),
}));
