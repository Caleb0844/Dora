import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomNav } from '@/components/bottom-nav';
import { PostActions } from '@/components/post-actions';
import {
  removeSavedPlace,
  savePlace,
} from '@/features/profile/saved-service';
import { FeedPost, getFeed } from '@/services/api/feed-service';
import { getMyProfile } from '@/features/profile/profile-service';
import { useBookmarkStore } from '@/store/bookmarks';
import { useExploredStore } from '@/store/explored';
import { theme } from '@/theme';

export default function HomeScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitingIds, setVisitingIds] = useState<string[]>([]);
  const [bookmarkingIds, setBookmarkingIds] = useState<string[]>([]);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const explored = useExploredStore((state) => state.explored);
  const setExplored = useExploredStore((state) => state.setExplored);
  const markExplored = useExploredStore((state) => state.markExplored);
  const saveBookmark = useBookmarkStore((state) => state.saveBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  useEffect(() => {
    async function loadHome() {
      try {
        await getMyProfile();

        const data = await getFeed();

        setPosts(data.content);

        data.content.forEach((post: FeedPost) => {
          if (explored[post.id] === undefined) {
            setExplored(post.id, post.visited);
          }
        });
      } catch (error: any) {
        if (error?.response?.status === 401) {
          router.replace('/login');
          return;
        }

        console.log(
          'Failed to load home:',
          error?.response?.data ?? error?.message
        );
      } finally {
        setLoading(false);
      }
    }

    void loadHome();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Twende</Text>

        <Pressable
          style={styles.searchHeaderButton}
          onPress={() => router.push('/explore')}
          accessibilityRole="button"
          accessibilityLabel="Search places"
        >
          <Ionicons
            name="search-outline"
            size={24}
            color={theme.colors.text}
          />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Pressable
              style={styles.postHeader}
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: item.creator.username },
                })
              }
            >
              {item.creator.profileImage ? (
                <Image
                  source={{ uri: item.creator.profileImage }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {item.creator.displayName?.charAt(0)?.toUpperCase() ?? 'T'}
                  </Text>
                </View>
              )}

              <View>
                <Text style={styles.creator}>
                  {item.creator.displayName}
                </Text>
                <Text style={styles.location}>
                  @{item.creator.username} · {item.county}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: item.id },
                })
              }
            >
              {item.images.length > 0 ? (
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.image, styles.noImage]}>
                  <Text style={styles.noImageText}>No image</Text>
                </View>
              )}
            </Pressable>

            <PostActions
              visited={explored[item.id] ?? item.visited}
              visiting={visitingIds.includes(item.id)}
              bookmarked={bookmarks[item.id] ?? item.bookmarked}
              onVisitedPress={async () => {
                if (
                  explored[item.id] ??
                  item.visited
                ) {
                  return;
                }

                setVisitingIds((current) => [...current, item.id]);

                try {
                  await markExplored(item.id);
                } catch (error: any) {
                  console.log(
                    'Explore failed:',
                    error?.response?.data ?? error?.message
                  );
                } finally {
                  setVisitingIds((current) =>
                    current.filter((id) => id !== item.id)
                  );
                }
              }}
              onBookmarkPress={async () => {
                if (bookmarkingIds.includes(item.id)) {
                  return;
                }

                const previousEffectiveValue = bookmarks[item.id] ?? item.bookmarked;
                const nextBookmarked = !previousEffectiveValue;

                setBookmarkingIds((current) => [...current, item.id]);

                try {
                  if (nextBookmarked) {
                    await saveBookmark(item.id);
                  } else {
                    await removeBookmark(item.id);
                  }
                } finally {
                  setBookmarkingIds((current) =>
                    current.filter((id) => id !== item.id)
                  );
                }
              }}
            />

            <View style={styles.details}>
              <Text style={styles.placeName}>{item.name}</Text>
              <Text style={styles.category}>
                {item.category} · {item.county}
              </Text>

              {!!item.description && (
                <View style={styles.descriptionWrapper}>
                  <Text
                    style={styles.description}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {item.description}
                  </Text>

                  <Pressable
                    style={styles.viewMoreButton}
                    onPress={() =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: item.id },
                      })
                    }
                  >
                    <Text style={styles.viewMoreText}>
                      View more
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 55,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  searchHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  feed: {
    paddingBottom: 8,
  },
  post: {
    backgroundColor: theme.colors.surface,
    marginBottom: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  avatarLetter: {
    color: theme.colors.white,
    fontWeight: '800',
  },
  creator: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  location: {
    marginTop: 2,
    fontSize: 13,
    color: theme.colors.muted,
  },
  image: {
    width: '100%',
    height: 390,
    backgroundColor: theme.colors.border,
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: theme.colors.muted,
  },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  category: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.accent,
  },
  descriptionWrapper: {
    position: 'relative',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  viewMoreButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingLeft: 6,
    backgroundColor: theme.colors.surface,
  },
  viewMoreText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.green,
  },
});
