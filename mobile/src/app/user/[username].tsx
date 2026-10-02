import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProfilePlaceGrid } from '@/components/profile-place-grid';
import {
  getPublicProfile,
  getPublicProfilePlaces,
  type PublicProfile,
  type PublicProfilePlace,
  type PublicProfileSort,
} from '@/features/profile/public-profile-service';
import { theme } from '@/theme';

const PAGE_SIZE = 12;

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [places, setPlaces] = useState<PublicProfilePlace[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [loading, setLoading] = useState(Boolean(username));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(
    username ? null : 'User not found.'
  );

  const [sort, setSort] =
    useState<PublicProfileSort>('newest');
  const [sortMenuOpen, setSortMenuOpen] =
    useState(false);
  const [searchOpen, setSearchOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] =
    useState('');

  const initialPlacesLoaded = useRef(false);
  const profileSearchRequestId = useRef(0);
  const scrollY = useMemo(() => new Animated.Value(0), []);

  const avatarScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.42],
    extrapolate: 'clamp',
  });

  const avatarTranslateX = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -105],
    extrapolate: 'clamp',
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 72],
    extrapolate: 'clamp',
  });

  const identityScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.72],
    extrapolate: 'clamp',
  });

  const identityTranslateX = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 34],
    extrapolate: 'clamp',
  });

  const identityTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -24],
    extrapolate: 'clamp',
  });

  const xpOpacity = scrollY.interpolate({
    inputRange: [20, 90],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const largeProfileOpacity = scrollY.interpolate({
    inputRange: [135, 160],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [145, 165],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [145, 165],
    outputRange: [4, 0],
    extrapolate: 'clamp',
  });

  const loadInitial = useCallback(async (targetUsername: string) => {
    try {
      setLoading(true);
      setError(null);

      const [profileData, placesData] = await Promise.all([
        getPublicProfile(targetUsername),
        getPublicProfilePlaces(
          targetUsername,
          0,
          PAGE_SIZE,
          '',
          'newest'
        ),
      ]);

      setProfile(profileData);
      setPlaces(placesData.content);
      setPage(placesData.page);
      setLastPage(placesData.last);
    } catch (requestError: any) {
      setProfile(null);
      setPlaces([]);

      setError(
        requestError?.response?.data?.message ??
          'Could not load this profile.'
      );
    } finally {
      initialPlacesLoaded.current = true;
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
   * This effect intentionally starts the async profile load when the route
   * username changes. State updates occur inside the async request lifecycle.
   */
  useEffect(() => {
    if (!username) {
      return;
    }

    void loadInitial(username);
  }, [username, loadInitial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const reloadPlaces = useCallback(async (
    targetSearch: string,
    targetSort: PublicProfileSort
  ) => {
    if (!username) {
      return;
    }

    const requestId = ++profileSearchRequestId.current;

    try {
      const placesData = await getPublicProfilePlaces(
        username,
        0,
        PAGE_SIZE,
        targetSearch,
        targetSort
      );

      if (requestId !== profileSearchRequestId.current) {
        return;
      }

      setPlaces(placesData.content);
      setPage(placesData.page);
      setLastPage(placesData.last);
    } catch (requestError) {
      if (requestId === profileSearchRequestId.current) {
        console.log(
          'Failed to filter public profile places:',
          requestError
        );
      }
    }
  }, [username]);

  useEffect(() => {
    if (!initialPlacesLoaded.current || !username) {
      return;
    }

    const timeout = setTimeout(() => {
      void reloadPlaces(searchQuery.trim(), sort);
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchQuery, sort, username, reloadPlaces]);

  async function loadMore() {
    if (!username || loadingMore || lastPage) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const placesData = await getPublicProfilePlaces(
        username,
        nextPage,
        PAGE_SIZE,
        searchQuery,
        sort
      );

      setPlaces((current) => [
        ...current,
        ...placesData.content,
      ]);

      setPage(placesData.page);
      setLastPage(placesData.last);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile || error) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.errorHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error ?? 'User not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.colors.text}
          />
        </Pressable>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.compactProfile,
            {
              opacity: compactHeaderOpacity,
              transform: [
                { translateY: compactHeaderTranslateY },
              ],
            },
          ]}
        >
          {profile.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={styles.compactAvatar}
            />
          ) : (
            <View style={styles.compactAvatarFallback}>
              <Ionicons
                name="person"
                size={17}
                color={theme.colors.textSecondary}
              />
            </View>
          )}

          <View style={styles.compactIdentity}>
            <Text
              style={styles.compactName}
              numberOfLines={1}
            >
              {profile.displayName ?? 'Twende User'}
            </Text>

            <Text
              style={styles.compactUsername}
              numberOfLines={1}
            >
              @{profile.username}
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: { y: scrollY },
              },
            },
          ],
          { useNativeDriver: true }
        )}
      >
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: largeProfileOpacity,
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [
                { translateX: avatarTranslateX },
                { translateY: avatarTranslateY },
                { scale: avatarScale },
              ],
            }}
          >
            {profile.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons
                  name="person"
                  size={38}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}
          </Animated.View>

          <Animated.View
            style={[
              styles.largeIdentity,
              {
                transform: [
                  { translateX: identityTranslateX },
                  { translateY: identityTranslateY },
                  { scale: identityScale },
                ],
              },
            ]}
          >
            <Text style={styles.displayName}>
              {profile.displayName ?? 'Twende User'}
            </Text>

            <Text style={styles.username}>
              @{profile.username}
            </Text>
          </Animated.View>

          <Animated.Text
            style={[
              styles.xp,
              {
                opacity: xpOpacity,
              },
            ]}
          >
            {profile.points} XP
          </Animated.Text>
        </Animated.View>

        <View style={styles.stickyControls}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>
                Places added
              </Text>

              <Text style={styles.placeCount}>
                {profile.placesContributed}
              </Text>
            </View>

            <View style={styles.controlButtons}>
              <Pressable
                style={styles.sortButton}
                accessibilityRole="button"
                accessibilityLabel="Sort places"
                onPress={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSortMenuOpen((current) => !current);
                }}
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={theme.colors.text}
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  setSortMenuOpen(false);

                  if (searchOpen) {
                    setSearchQuery('');
                    setSearchOpen(false);
                  } else {
                    setSearchOpen(true);
                  }
                }}
              >
                <Ionicons
                  name={
                    searchOpen
                      ? 'close-outline'
                      : 'search-outline'
                  }
                  size={21}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>
          </View>

          {sortMenuOpen && (
            <View style={styles.sortMenu}>
              {(['newest', 'oldest'] as PublicProfileSort[]).map(
                (option) => (
                  <Pressable
                    key={option}
                    style={styles.sortOption}
                    onPress={() => {
                      setSort(option);
                      setSortMenuOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sort === option &&
                          styles.activeSortOptionText,
                      ]}
                    >
                      {option === 'newest'
                        ? 'Newest'
                        : 'Oldest'}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {searchOpen && (
            <View style={styles.profileSearchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textSecondary}
              />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search places"
                placeholderTextColor={
                  theme.colors.textSecondary
                }
                style={styles.profileSearchInput}
              />

              {!!searchQuery && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {places.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No places added yet.
            </Text>
          </View>
        ) : (
          <>
            <ProfilePlaceGrid
              publicProfileLayout
              places={places.map((place) => ({
                id: place.id,
                name: place.name,
                image: place.thumbnailUrl,
              }))}
              onPressPlace={(place) =>
                router.push({
                  pathname: '/place/[id]',
                  params: {
                    id: place.id,
                    fromProfile: '1',
                  },
                })
              }
            />

            {!lastPage && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load more
                  </Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSoft,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  topBar: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  compactProfile: {
    flex: 1,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.border,
  },
  compactAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactIdentity: {
    flex: 1,
    marginLeft: 9,
  },
  compactName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  compactUsername: {
    marginTop: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    width: 36,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 190,
  },
  largeIdentity: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  displayName: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  username: {
    marginTop: 4,
    color: theme.colors.green,
    fontSize: 15,
    fontWeight: '600',
  },
  xp: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  stickyControls: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    backgroundColor: theme.colors.surfaceSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    zIndex: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  placeCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortMenu: {
    position: 'absolute',
    top: 52,
    right: 62,
    width: 115,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 50,
    elevation: 8,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortOptionText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  activeSortOptionText: {
    color: theme.colors.green,
    fontWeight: '800',
  },
  profileSearchBox: {
    minHeight: 42,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileSearchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: 22,
    minWidth: 120,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadMoreText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
