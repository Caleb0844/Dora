import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomNav } from '@/components/bottom-nav';
import { PostActions } from '@/components/post-actions';
import { FeedPost, getFeed } from '@/services/api/feed-service';
import { checkInPlace } from '@/features/profile/check-in-service';
import { savePlace, removeSavedPlace } from '@/features/profile/saved-service';
import { theme } from '@/theme';

export default function HomeScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitingIds, setVisitingIds] = useState<string[]>([]);

  useEffect(() => {
    getFeed()
      .then((data) => {
        setPosts(data.content);
      })
      .catch((error) => {
        console.log('Failed to load feed:', error);
      })
      .finally(() => {
        setLoading(false);
      });
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
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              {item.creator.profileImage ? (
                <Image
                  source={{ uri: item.creator.profileImage }}
                  style={styles.avatarImage}
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
            </View>

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
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, styles.noImage]}>
                  <Text style={styles.noImageText}>No image</Text>
                </View>
              )}
            </Pressable>

            <PostActions
              visited={item.visited}
              visiting={visitingIds.includes(item.id)}
              bookmarked={item.bookmarked}
              onVisitedPress={async () => {
                setPosts((current) =>
                  current.map((post) =>
                    post.id === item.id
                      ? { ...post, visited: true }
                      : post
                  )
                );

                setVisitingIds((current) => [...current, item.id]);

                try {
                  await checkInPlace(item.id);
                } catch (error: any) {
                  setPosts((current) =>
                    current.map((post) =>
                      post.id === item.id
                        ? { ...post, visited: false }
                        : post
                    )
                  );

                  console.log(
                    'Check-in failed:',
                    error?.response?.data ?? error?.message
                  );
                } finally {
                  setVisitingIds((current) =>
                    current.filter((id) => id !== item.id)
                  );
                }
              }}
              onBookmarkPress={async () => {
                const wasBookmarked = item.bookmarked;

                setPosts((current) =>
                  current.map((post) =>
                    post.id === item.id
                      ? { ...post, bookmarked: !wasBookmarked }
                      : post
                  )
                );

                try {
                  if (wasBookmarked) {
                    await removeSavedPlace(item.id);
                  } else {
                    await savePlace(item.id);
                  }
                } catch (error: any) {
                  setPosts((current) =>
                    current.map((post) =>
                      post.id === item.id
                        ? { ...post, bookmarked: wasBookmarked }
                        : post
                    )
                  );

                  console.log(
                    'Bookmark update failed:',
                    error?.response?.data ?? error?.message
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
                <Text style={styles.description}>
                  {item.description}
                </Text>
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
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
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
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
});
