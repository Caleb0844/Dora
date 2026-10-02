import { create } from 'zustand';

export type AuthPromptReason =
  | 'add'
  | 'profile'
  | 'bookmark'
  | 'explore';

type AuthPromptStore = {
  isOpen: boolean;
  reason: AuthPromptReason | null;
  openPrompt: (reason: AuthPromptReason) => void;
  closePrompt: () => void;
};

export const useAuthPromptStore = create<AuthPromptStore>((set) => ({
  isOpen: false,
  reason: null,

  openPrompt: (reason) =>
    set({
      isOpen: true,
      reason,
    }),

  closePrompt: () =>
    set({
      isOpen: false,
      reason: null,
    }),
}));
