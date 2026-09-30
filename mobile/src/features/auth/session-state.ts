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

export async function resetAccountScopedState(
  options: ResetAccountStateOptions = {}
) {
  await Promise.all([
    queryClient.cancelQueries({
      queryKey: ['profile', 'me'],
    }),
    queryClient.cancelQueries({
      queryKey: ['feed'],
    }),
  ]);

  useBookmarkStore.setState({
    bookmarks: {},
  });

  useExploredStore.setState({
    explored: {},
  });

  queryClient.removeQueries({
    queryKey: ['profile', 'me'],
  });

  queryClient.setQueriesData<FeedData>(
    {
      queryKey: ['feed'],
    },
    (current) => {
      if (!current) {
        return current;
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
