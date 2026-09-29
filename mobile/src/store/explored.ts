import { create } from 'zustand';

import { checkInPlace } from '@/features/profile/check-in-service';

type ExploredMap = Record<string, boolean>;

type ExploredStore = {
  explored: ExploredMap;
  setExplored: (placeId: string, value: boolean) => void;
  markExplored: (placeId: string) => Promise<void>;
};

export const useExploredStore = create<ExploredStore>((set, get) => ({
  explored: {},

  setExplored: (placeId, value) =>
    set((state) => ({
      explored: {
        ...state.explored,
        [placeId]: value,
      },
    })),

  markExplored: async (placeId) => {
    const previousValue = get().explored[placeId];

    get().setExplored(placeId, true);

    try {
      await checkInPlace(placeId);
    } catch (error: any) {
      if (previousValue === undefined) {
        set((state) => {
          const nextExplored = { ...state.explored };
          delete nextExplored[placeId];

          return {
            explored: nextExplored,
          };
        });
      } else {
        get().setExplored(placeId, previousValue);
      }

      console.log(
        'Explore update failed:',
        error?.response?.data ?? error?.message
      );

      throw error;
    }
  },
}));
