import { create } from 'zustand';

type HomeChromeStore = {
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
};

export const useHomeChromeStore = create<HomeChromeStore>((set) => ({
  bottomNavVisible: true,

  setBottomNavVisible: (visible) =>
    set((state) =>
      state.bottomNavVisible === visible
        ? state
        : { bottomNavVisible: visible }
    ),
}));
