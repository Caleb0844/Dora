import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';

import { PlaceMetaSwitch } from '@/components/place-meta-switch';
import { RequestErrorState } from '@/components/request-error-state';
import { FeedPost, getFeed } from '@/services/api/feed-service';
import { useAuthIntentStore } from '@/store/auth-intent';
import { useAuthPromptStore } from '@/store/auth-prompt';
import { useAuthSessionStore } from '@/store/auth-session';
import { useBookmarkStore } from '@/store/bookmarks';
import { useExploredStore } from '@/store/explored';
import { useHomeChromeStore } from '@/store/home-chrome';
import { theme } from '@/theme';

const feedViewabilityConfig = {
  itemVisiblePercentThreshold: 20,
};

type AnimatedBookmarkButtonProps = {
  bookmarked: boolean;
  busy: boolean;
  onPress: () => void;
};

function AnimatedBookmarkButton({
  bookmarked,
  busy,
  onPress,
}: AnimatedBookmarkButtonProps) {
  const [scale] = useState(
    () => new Animated.Value(1)
  );

  function animateBookmark() {
    if (busy) {
      return;
    }

    scale.stopAnimation();

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.32,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 28,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <Pressable
      style={styles.imageBookmark}
      disabled={busy}
      onPressIn={animateBookmark}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        bookmarked
          ? 'Remove saved place'
          : 'Save place'
      }
    >
      <Animated.View
        style={{
          transform: [{ scale }],
        }}
      >
        <Ionicons
          name={
            bookmarked
              ? 'bookmark'
              : 'bookmark-outline'
          }
          size={23}
          color="#FFFFFF"
        />
      </Animated.View>
    </Pressable>
  );
}

function feedShuffleScore(id: string, version: number) {
  let hash = 2166136261 ^ version;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<FeedPost>>(null);
  const lastScrollY = useRef(0);

  const [shuffleVersion, setShuffleVersion] = useState(0);

  const [infoMenu, setInfoMenu] = useState<{
    post: FeedPost;
    top: number;
  } | null>(null);


  const [infoContentOpacity] = useState(
    () => new Animated.Value(0)
  );

  const [infoPanelProgress] = useState(
    () => new Animated.Value(0)
  );
  const [bookmarkingIds, setBookmarkingIds] = useState<string[]>([]);
  const setAuthIntent = useAuthIntentStore((state) => state.setIntent);
  const openAuthPrompt = useAuthPromptStore(
    (state) => state.openPrompt
  );
  const authStatus = useAuthSessionStore((state) => state.status);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const setExplored = useExploredStore((state) => state.setExplored);
  const saveBookmark = useBookmarkStore((state) => state.saveBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const setBottomNavVisible = useHomeChromeStore(
    (state) => state.setBottomNavVisible
  );

  const openInfoMenu = useCallback(
    (post: FeedPost) => {
      infoPanelProgress.stopAnimation();
      infoContentOpacity.stopAnimation();

      infoPanelProgress.setValue(0);
      infoContentOpacity.setValue(0);

      setInfoMenu({
        post,
        top: 120,
      });

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(infoPanelProgress, {
            toValue: 1,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.timing(infoContentOpacity, {
            toValue: 1,
            duration: 80,
            delay: 25,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [infoContentOpacity, infoPanelProgress]
  );

  const closeInfoMenu = useCallback(() => {
    infoPanelProgress.stopAnimation();
    infoContentOpacity.stopAnimation();

    // Do not fade the content while closing.
    // Move the whole panel away once, quickly.
    infoContentOpacity.setValue(1);

    Animated.timing(infoPanelProgress, {
      toValue: 0,
      duration: 85,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setInfoMenu(null);
      }
    });
  }, [infoContentOpacity, infoPanelProgress]);

  const {
    data: feedData,
    isPending,
    error: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', 'home', 'infinite'],
    queryFn: ({ pageParam }) => getFeed(pageParam.page, 10),
    initialPageParam: {
      page: 0,
      cycle: 0,
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.totalElements === 0) {
        return undefined;
      }

      if (lastPage.last) {
        return {
          page: 0,
          cycle: lastPageParam.cycle + 1,
        };
      }

      return {
        page: lastPage.page + 1,
        cycle: lastPageParam.cycle,
      };
    },
    staleTime: 5 * 60_000,
  });

  const posts = useMemo(() => {
    if (!feedData || feedData.pages.length === 0) {
      return [];
    }

    return feedData.pages.flatMap((page, pageIndex) =>
      [...page.content].sort(
        (left, right) =>
          feedShuffleScore(
            left.id,
            shuffleVersion + pageIndex * 1009
          ) -
          feedShuffleScore(
            right.id,
            shuffleVersion + pageIndex * 1009
          )
      )
    );
  }, [feedData, shuffleVersion]);

  const handleViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
    }) => {
      if (viewableItems.length === 0) {
        return;
      }

      const lastVisibleIndex = Math.max(
        ...viewableItems.map((item) => item.index ?? -1)
      );

      // Start loading when the user is about 6 posts from
      // the currently loaded end of the feed.
      if (
        posts.length > 0 &&
        lastVisibleIndex >= posts.length - 7 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        void fetchNextPage();
      }
    },
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      posts.length,
    ]
  );

  useEffect(() => {
    const addTabPressListener = navigation.addListener as unknown as (
      event: 'tabPress',
      listener: () => void
    ) => () => void;

    const unsubscribe = addTabPressListener('tabPress', () => {
      if (!navigation.isFocused()) {
        return;
      }

      setBottomNavVisible(true);

      listRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      });

      setShuffleVersion((current) => current + 1);

      void queryClient.resetQueries({
        queryKey: ['feed', 'home', 'infinite'],
        exact: true,
      });
    });

    return unsubscribe;
  }, [navigation, queryClient, setBottomNavVisible]);

  useEffect(() => {
    if (!feedData) {
      return;
    }

    feedData.pages.forEach((page) => {
      page.content.forEach((post: FeedPost) => {
        const currentExplored =
          useExploredStore.getState().explored;

        if (currentExplored[post.id] === undefined) {
          setExplored(post.id, post.visited);
        }
      });
    });
  }, [feedData, setExplored]);

  useEffect(() => {
    if (!feedError) {
      return;
    }

    const error = feedError as any;

    console.log(
      'Failed to load home:',
      error?.response?.data ?? error?.message
    );
  }, [feedError]);

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
        ref={listRef}
        data={isPending ? [] : posts}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListEmptyComponent={
          isPending ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator size="large" />
              <Text style={styles.feedLoadingText}>
                Finding places for you...
              </Text>
            </View>
          ) : feedError ? (
            <RequestErrorState
              error={feedError}
              title="Could not load places"
              fallbackMessage="We could not load places right now. Please try again."
              onRetry={() => {
                void refetch();
              }}
            />
          ) : null
        }
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={feedViewabilityConfig}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={() => {
          setShuffleVersion((current) => current + 1);

          void queryClient.resetQueries({
            queryKey: ['feed', 'home', 'infinite'],
            exact: true,
          });
        }}
        onScroll={({ nativeEvent }) => {
          const currentY = Math.max(
            0,
            nativeEvent.contentOffset.y
          );

          const scrollDifference =
            currentY - lastScrollY.current;

          // Home top/header returns only when we genuinely reach
          // the beginning again. The bottom nav returns as soon as
          // the user starts scrolling downward.
          if (currentY <= 12) {
            setBottomNavVisible(true);
          } else if (scrollDifference > 5) {
            setBottomNavVisible(false);
          } else if (scrollDifference < -5) {
            setBottomNavVisible(true);
          }

          lastScrollY.current = currentY;

          const visibleBottom =
            currentY +
            nativeEvent.layoutMeasurement.height;

          const remaining =
            nativeEvent.contentSize.height - visibleBottom;

          const preloadDistance =
            nativeEvent.layoutMeasurement.height * 3;

          if (
            remaining < preloadDistance &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage();
          }
        }}
        scrollEventThrottle={16}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.compactCreatorHeader}>
              <Pressable
                style={styles.creatorProfileButton}
                onPress={() =>
                  router.push({
                    pathname: '/user/[username]',
                    params: {
                      username: item.creator.username,
                    },
                  })
                }
              >
              {item.creator.profileImage ? (
                <Image
                  source={{
                    uri: item.creator.profileImage,
                  }}
                  style={styles.compactAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.compactAvatarFallback}>
                  <Text style={styles.compactAvatarLetter}>
                    {item.creator.displayName
                      ?.charAt(0)
                      ?.toUpperCase() ?? 'T'}
                  </Text>
                </View>
              )}

              <View style={styles.compactCreatorInfo}>
                <Text style={styles.compactCreatorName}>
                  {item.creator.displayName}
                </Text>

                <View style={styles.usernameMetaRow}>
                  <Text style={styles.compactUsername}>
                    @{item.creator.username}
                  </Text>

                  <PlaceMetaSwitch
                    county={item.county}
                    category={item.category}
                  />
                </View>
              </View>
              </Pressable>

              <Pressable
                style={styles.infoMenuButton}
                onPressIn={() => {
                  openInfoMenu(item);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Place information"
              >
                <View style={styles.menuLineLarge} />
                <View style={styles.menuLineMedium} />
                <View style={styles.menuLineSmall} />
              </Pressable>
            </View>

            <View style={styles.imageWrapper}>
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

              <AnimatedBookmarkButton
                bookmarked={
                  bookmarks[item.id] ?? item.bookmarked
                }
                busy={bookmarkingIds.includes(item.id)}
                onPress={async () => {
                  if (authStatus !== 'authenticated') {
                    setAuthIntent({
                      type: 'bookmark',
                      placeId: item.id,
                    });

                    openAuthPrompt('bookmark');
                    return;
                  }

                  if (bookmarkingIds.includes(item.id)) {
                    return;
                  }

                  const previousEffectiveValue =
                    bookmarks[item.id] ?? item.bookmarked;

                  const nextBookmarked =
                    !previousEffectiveValue;

                  setBookmarkingIds((current) => [
                    ...current,
                    item.id,
                  ]);

                  try {
                    if (nextBookmarked) {
                      await saveBookmark(item.id);
                    } else {
                      await removeBookmark(item.id);
                    }
                  } finally {
                    setBookmarkingIds((current) =>
                      current.filter(
                        (id) => id !== item.id
                      )
                    );
                  }
                }}
              />
            </View>

            <View style={styles.details}>
              <Text style={styles.placeName}>{item.name}</Text>

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

      <Modal
        visible={infoMenu !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeInfoMenu}
      >
        <Pressable
          style={styles.infoBackdrop}
          onPressIn={closeInfoMenu}
        >
          {infoMenu ? (
            <Animated.View
              style={[
                styles.infoPanel,
                {
                  transform: [
                    {
                      translateY: infoPanelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                    {
                      translateX: infoPanelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 0],
                      }),
                    },
                    {
                      scale: infoPanelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                style={styles.infoCloseButton}
                onPressIn={closeInfoMenu}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close place information"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>

              <Animated.View
                pointerEvents="none"
                style={{
                  opacity: infoContentOpacity,
                }}
              >
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Added by
                  </Text>
                  <Text style={styles.infoValue}>
                    {infoMenu.post.creator.displayName}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Place
                  </Text>
                  <Text style={styles.infoValue}>
                    {infoMenu.post.name}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Category
                  </Text>
                  <Text style={styles.infoValue}>
                    {infoMenu.post.category}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    County
                  </Text>
                  <Text style={styles.infoValue}>
                    {infoMenu.post.county}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Coordinates
                  </Text>
                  <Text style={styles.infoValue}>
                    {infoMenu.post.latitude.toFixed(5)},{' '}
                    {infoMenu.post.longitude.toFixed(5)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Date
                  </Text>
                  <Text style={styles.infoValue}>
                    {new Date(
                      infoMenu.post.createdAt
                    ).toLocaleDateString()}
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  feedLoading: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLoadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  header: {
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 24) + 10
        : 14,
    paddingBottom: 12,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  avatarLetter: {
    color: theme.colors.white,
    fontWeight: '800',
  },
  creatorInfo: {
    flex: 1,
  },
  usernameMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    marginTop: 1,
    fontSize: 12,
    color: theme.colors.green,
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
  compactCreatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: theme.colors.surface,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  compactAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  compactAvatarLetter: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  creatorProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCreatorInfo: {
    flex: 1,
  },
  compactCreatorName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  compactUsername: {
    color: theme.colors.green,
    fontSize: 12,
    fontWeight: '600',
  },
  infoMenuButton: {
    width: 48,
    height: 44,
    marginLeft: 4,
    zIndex: 20,
    elevation: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  menuLineLarge: {
    width: 22,
    height: 2,
    backgroundColor: theme.colors.text,
  },
  menuLineMedium: {
    width: 15,
    height: 2,
    backgroundColor: theme.colors.text,
  },
  menuLineSmall: {
    width: 10,
    height: 2,
    backgroundColor: theme.colors.text,
  },
  infoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  infoPanel: {
    position: 'absolute',
    top: 120,
    right: 10,
    width: 290,
    paddingTop: 34,
    paddingBottom: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoSkeletonWide: {
    height: 14,
    width: '82%',
    marginVertical: 10,
    backgroundColor: theme.colors.border,
  },
  infoSkeletonMedium: {
    height: 14,
    width: '58%',
    marginVertical: 10,
    backgroundColor: theme.colors.border,
  },
  infoCloseButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  infoRow: {
    minHeight: 40,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 2,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  imageWrapper: {
    position: 'relative',
  },
  imageBookmark: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
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
