import { router } from 'expo-router';

import { useAuthIntentStore } from '@/store/auth-intent';
import { useBookmarkStore } from '@/store/bookmarks';
import { useExploredStore } from '@/store/explored';

function isConflict(error: any) {
  return error?.response?.status === 409;
}

export async function resumeAfterAuth() {
  const { intent, clearIntent } = useAuthIntentStore.getState();

  if (intent?.type === 'route') {
    // Add/Profile requests from guest mode should never resume
    // the protected destination after authentication.
    clearIntent();
    router.replace('/');
    return;
  }

  if (intent?.type === 'bookmark') {
    try {
      await useBookmarkStore.getState().saveBookmark(intent.placeId);
    } catch (error: any) {
      if (!isConflict(error)) {
        throw error;
      }

      useBookmarkStore
        .getState()
        .setBookmarked(intent.placeId, true);
    }

    clearIntent();
    router.replace('/');
    return;
  }

  if (intent?.type === 'explore') {
    try {
      await useExploredStore.getState().markExplored(intent.placeId);
    } catch (error: any) {
      if (!isConflict(error)) {
        throw error;
      }

      useExploredStore
        .getState()
        .setExplored(intent.placeId, true);
    }

    clearIntent();
    router.replace('/');
    return;
  }

  clearIntent();
  router.replace('/');
}
