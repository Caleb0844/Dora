import { getFeed } from '@/services/api/feed-service';
import { queryClient } from '@/services/query/query-client';
import { useAuthIntentStore } from '@/store/auth-intent';
import { useBookmarkStore } from '@/store/bookmarks';
import { useExploredStore } from '@/store/explored';

type ResetAccountStateOptions = {
  clearAuthIntent?: boolean;
  refreshFeed?: boolean;
};

type FeedData = Awaited<ReturnType<typeof getFeed>>;

type InfiniteFeedData = {
  pages: FeedData[];
  pageParams: unknown[];
};

export async function resetAccountScopedState(
  options: ResetAccountStateOptions = {}
) {
  // Do not make authentication/navigation wait for query cancellation.
  // These are cleanup operations and can finish in the background.
  void queryClient.cancelQueries({
    queryKey: ['profile', 'me'],
  });

  void queryClient.cancelQueries({
    queryKey: ['feed'],
  });

  useBookmarkStore.setState({
    bookmarks: {},
  });

  useExploredStore.setState({
    explored: {},
  });

  queryClient.removeQueries({
    queryKey: ['profile', 'me'],
  });

  queryClient.setQueriesData<FeedData | InfiniteFeedData>(
    {
      queryKey: ['feed'],
    },
    (current) => {
      if (!current) {
        return current;
      }

      if ('pages' in current) {
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            content: page.content.map((post) => ({
              ...post,
              bookmarked: false,
              visited: false,
            })),
          })),
        };
      }

      return {
        ...current,
        content: current.content.map((post) => ({
          ...post,
          bookmarked: false,
          visited: false,
        })),
      };
    }
  );

  if (options.refreshFeed) {
    void queryClient.invalidateQueries({
      queryKey: ['feed'],
      refetchType: 'active',
    });
  }

  if (options.clearAuthIntent) {
    useAuthIntentStore.getState().clearIntent();
  }
}
