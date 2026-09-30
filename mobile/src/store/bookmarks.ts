import { create } from 'zustand';

import {
  removeSavedPlace,
  savePlace,
} from '@/features/profile/saved-service';
import { queryClient } from '@/services/query/query-client';

type BookmarkMap = Record<string, boolean>;

type BookmarkStore = {
  bookmarks: BookmarkMap;
  setBookmarked: (placeId: string, value: boolean) => void;
  saveBookmark: (placeId: string) => Promise<void>;
  removeBookmark: (placeId: string) => Promise<void>;
};

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: {},
  setBookmarked: (placeId, value) =>
    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [placeId]: value,
      },
    })),
  saveBookmark: async (placeId) => {
    const previousValue = get().bookmarks[placeId];
    const optimisticValue = true;

    get().setBookmarked(placeId, optimisticValue);

    try {
      await savePlace(placeId);

      await queryClient.invalidateQueries({
        queryKey: ['profile', 'me', 'saved'],
      });
    } catch (error: any) {
      if (previousValue === undefined) {
        set((state) => {
          const nextBookmarks = { ...state.bookmarks };
          delete nextBookmarks[placeId];
          return { bookmarks: nextBookmarks };
        });
      } else {
        get().setBookmarked(placeId, previousValue);
      }

      console.log(
        'Bookmark update failed:',
        error?.response?.data ?? error?.message
      );
      throw error;
    }
  },
  removeBookmark: async (placeId) => {
    const previousValue = get().bookmarks[placeId];
    const optimisticValue = false;

    get().setBookmarked(placeId, optimisticValue);

    try {
      await removeSavedPlace(placeId);

      await queryClient.invalidateQueries({
        queryKey: ['profile', 'me', 'saved'],
      });
    } catch (error: any) {
      if (previousValue === undefined) {
        set((state) => {
          const nextBookmarks = { ...state.bookmarks };
          delete nextBookmarks[placeId];
          return { bookmarks: nextBookmarks };
        });
      } else {
        get().setBookmarked(placeId, previousValue);
      }

      console.log(
        'Bookmark update failed:',
        error?.response?.data ?? error?.message
      );
      throw error;
    }
  },
}));
