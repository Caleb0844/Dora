import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ActionLoadingModal } from '@/components/action-loading-modal';
import { RequestErrorState } from '@/components/request-error-state';
import { getAppError } from '@/services/api/error-utils';
import { getPlace, type PlaceDetails } from '@/services/api/place-service';
import { useAuthIntentStore } from '@/store/auth-intent';
import { useAuthPromptStore } from '@/store/auth-prompt';
import { useAuthSessionStore } from '@/store/auth-session';
import { useBookmarkStore } from '@/store/bookmarks';
import { useExploredStore } from '@/store/explored';
import { theme } from '@/theme';

function formatPlaceDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate();
  const month = date
    .toLocaleDateString('en-US', { month: 'short' });

  return `${day} ${month}`;
}

function CreatorMetaSwitch({
  county,
  createdAt,
}: {
  county: string;
  createdAt: string;
}) {
  const [showDate, setShowDate] = useState(false);
  const [translateY] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let running = false;

    const interval = setInterval(() => {
      if (running) return;

      running = true;

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -8,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowDate((current) => !current);

        translateY.setValue(8);

        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(() => {
          running = false;
        });
      });
    }, 2600);

    return () => clearInterval(interval);
  }, [opacity, translateY]);

  return (
    <View style={styles.metaSwitch}>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.metaSwitchText,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {showDate
          ? formatPlaceDate(createdAt)
          : county}
      </Animated.Text>
    </View>
  );
}

export default function PlaceDetailsScreen() {
  const { id, fromProfile } = useLocalSearchParams<{
    id: string;
    fromProfile?: string;
  }>();

  const placeId = Array.isArray(id) ? id[0] : id;
  const { width: windowWidth } = useWindowDimensions();

  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [bookmarkActionLabel, setBookmarkActionLabel] =
    useState<string | null>(null);
  const [markingExplored, setMarkingExplored] = useState(false);

  const authStatus = useAuthSessionStore((state) => state.status);
  const setAuthIntent = useAuthIntentStore((state) => state.setIntent);
  const openAuthPrompt = useAuthPromptStore(
    (state) => state.openPrompt
  );

  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const explored = useExploredStore((state) => state.explored);
  const setExplored = useExploredStore((state) => state.setExplored);
  const markExplored = useExploredStore((state) => state.markExplored);
  const saveBookmark = useBookmarkStore((state) => state.saveBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const isBookmarked = placeId
    ? bookmarks[placeId] ?? Boolean(place?.bookmarked)
    : false;

  const loadPlace = useCallback(async () => {
    if (!placeId) {
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const data = await getPlace(placeId);

      setPlace(data);

      const currentExplored =
        useExploredStore.getState().explored;

      if (currentExplored[placeId] === undefined) {
        setExplored(placeId, data.explored);
      }
    } catch (error) {
      console.log('Failed to load place:', error);
      setPlace(null);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [placeId, setExplored]);

  useEffect(() => {
    void loadPlace();
  }, [loadPlace]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.green} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.screen}>
        <RequestErrorState
          error={loadError}
          title="Could not load this place"
          fallbackMessage="This place could not be loaded right now. Please try again."
          onRetry={() => {
            void loadPlace();
          }}
        />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Place could not be loaded.
        </Text>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const images: string[] = place.images ?? [];

  const handleMarkExplored = async () => {
    if (
      !placeId ||
      (explored[placeId] ?? place.explored) ||
      markingExplored
    ) {
      return;
    }

    if (authStatus !== 'authenticated') {
      setAuthIntent({
        type: 'explore',
        placeId,
      });

      openAuthPrompt('explore');
      return;
    }

    try {
      setMarkingExplored(true);

      await markExplored(placeId);

      const refreshedPlace = await getPlace(placeId);
      setPlace(refreshedPlace);
    } catch (error) {
      console.log('Failed to mark place as explored:', error);
      Alert.alert('Could not mark as explored', 'Please try again.');
    } finally {
      setMarkingExplored(false);
    }
  };

  const handleOpenMap = async () => {
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Location unavailable', 'This place does not have coordinates yet.');
      return;
    }

const url =
  `https://www.google.com/maps/dir/?api=1` +
  `&destination=${latitude},${longitude}` +
  `&dir_action=`; 
     await Linking.openURL(url);
  };

  return (
    <View style={styles.screen}>
      <ActionLoadingModal
        visible={savingBookmark}
        label={bookmarkActionLabel ?? 'Saving...'}
      />

      <Pressable
        style={styles.fixedBackButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color={theme.colors.text}
        />
      </Pressable>

        {place.creator && (
          <Pressable
            style={styles.creatorHeader}
            onPress={() => {
              if (fromProfile === '1') {
                router.back();
                return;
              }

              router.push({
                pathname: '/user/[username]',
                params: { username: place.creator.username },
              });
            }}
          >
            <View style={styles.headerAvatar}>
              {place.creator.profileImage ? (
                <Image
                  source={{ uri: place.creator.profileImage }}
                  style={styles.headerAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons
                  name="person"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              )}
            </View>
            <View style={styles.headerCreatorInfo}>
              <Text
                style={styles.headerDisplayName}
                numberOfLines={1}
              >
                {place.creator.displayName ?? place.creator.username}
              </Text>

              <View style={styles.headerMetaRow}>
                <Text style={styles.headerUsername}>
                  @{place.creator.username}
                </Text>

                <Text style={styles.headerMetaSeparator}>·</Text>

                <CreatorMetaSwitch
                  county={place.county}
                  createdAt={place.createdAt}
                />
              </View>
            </View>
          </Pressable>
        )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.gallery}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / windowWidth
              );
              setSelectedImage(Math.min(index, images.length - 1));
            }}
          >
            {images.length > 0 ? (
              images.map((image, index) => (
                <Image
                  key={`${image}-${index}`}
                  source={{ uri: image }}
                  style={[styles.heroImage, { width: windowWidth }]}
                  contentFit="cover"
                />
              ))
            ) : (
              <View
                style={[styles.heroPlaceholder, { width: windowWidth }]}
              />
            )}
          </ScrollView>

          {images.length > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {selectedImage + 1} / {images.length}
              </Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.paginationDots}>
              {images.map((image, index) => (
                <View
                  key={`${image}-dot-${index}`}
                  style={[
                    styles.paginationDot,
                    selectedImage === index && styles.paginationDotSelected,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {place.name}
          </Text>

          <View style={styles.placeActions}>
            <Text
              style={styles.categoryText}
              numberOfLines={1}
            >
              {place.category}
            </Text>

            <Pressable
              style={styles.mapAction}
              accessibilityRole="button"
              accessibilityLabel="Open in Google Maps"
              onPress={handleOpenMap}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="google-maps"
                size={28}
                color={theme.colors.green}
              />
            </Pressable>

            <View style={styles.actionSpacer} />

            <Pressable
              style={[
                styles.bookmarkAction,
                savingBookmark && styles.actionDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isBookmarked ? 'Remove saved place' : 'Save place'
              }
              disabled={savingBookmark}
              onPress={async () => {
                if (!placeId || savingBookmark) {
                  return;
                }

                if (authStatus !== 'authenticated') {
                  setAuthIntent({
                    type: 'bookmark',
                    placeId,
                  });

                  openAuthPrompt('bookmark');
                  return;
                }

                const previousEffectiveValue =
                  bookmarks[placeId] ?? Boolean(place?.bookmarked);

                const shouldSave = !previousEffectiveValue;

                setSavingBookmark(true);
                setBookmarkActionLabel(
                  shouldSave ? 'Adding...' : 'Removing...'
                );

                // Let React Native paint the blocking popup before
                // starting the network request.
                await new Promise<void>((resolve) => {
                  requestAnimationFrame(() => resolve());
                });

                try {
                  if (shouldSave) {
                    await saveBookmark(placeId);

                    Alert.alert(
                      'Place saved',
                      `${place.name} was added to your saved places.`
                    );
                  } else {
                    await removeBookmark(placeId);

                    Alert.alert(
                      'Place removed',
                      `${place.name} was removed from your saved places.`
                    );
                  }
                } catch (error) {
                  const appError = getAppError(
                    error,
                    shouldSave
                      ? 'Could not save this place. Please try again.'
                      : 'Could not remove this place. Please try again.'
                  );

                  Alert.alert(
                    shouldSave
                      ? 'Could not save place'
                      : 'Could not remove place',
                    appError.message
                  );
                } finally {
                  setBookmarkActionLabel(null);
                  setSavingBookmark(false);
                }
              }}
            >
              <Ionicons
                name={
                  isBookmarked
                    ? 'bookmark'
                    : 'bookmark-outline'
                }
                size={23}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.exploreBar,
              (explored[placeId] ?? place.explored) &&
                styles.exploreBarDone,
              markingExplored && styles.actionDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              (explored[placeId] ?? place.explored)
                ? 'Place already explored'
                : 'Mark place as explored'
            }
            disabled={
              (explored[placeId] ?? place.explored) ||
              markingExplored
            }
            onPress={handleMarkExplored}
          >
            <Ionicons
              name={
                (explored[placeId] ?? place.explored)
                  ? 'checkmark-circle'
                  : 'checkmark-circle-outline'
              }
              size={25}
              color={
                (explored[placeId] ?? place.explored)
                  ? theme.colors.green
                  : theme.colors.textSecondary
              }
            />

            <Text style={styles.exploreBarText}>
              {(explored[placeId] ?? place.explored)
                ? 'Explored'
                : 'Explore'}
            </Text>

            <View style={styles.exploreBarSpacer} />

            <Text style={styles.explorerCount}>
              {markingExplored
                ? 'Saving...'
                : `${place.explorerCount} ${
                    place.explorerCount === 1
                      ? 'explorer'
                      : 'explorers'
                  }`}
            </Text>
          </Pressable>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>
              About this place
            </Text>

            <Text style={styles.description}>
              {place.description}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 17,
  },
  backText: {
    marginTop: 14,
    color: theme.colors.green,
    fontWeight: '700',
  },
  fixedBackButton: {
    position: 'absolute',
    top: 90,
    left: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },

  creatorHeader: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSoft,
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerCreatorInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerDisplayName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  headerMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUsername: {
    color: theme.colors.green,
    fontSize: 12,
    fontWeight: '600',
  },
  headerMetaSeparator: {
    marginHorizontal: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  headerCounty: {
    flexShrink: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  headerDate: {
    flexShrink: 0,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metaSwitch: {
    position: 'relative',
    height: 16,
    minWidth: 72,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  metaSwitchText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  hero: {
    position: 'relative',
    width: '100%',
    height: 520,
  },
  gallery: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceSoft,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  paginationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  paginationDotSelected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.white,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 60,
  },
  title: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.text,
  },
  placeActions: {
    marginTop: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryText: {
    maxWidth: 170,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  mapAction: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSpacer: {
    flex: 1,
  },
  bookmarkAction: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  exploreBar: {
    marginTop: 14,
    marginHorizontal: -12,
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  exploreBarDone: {
    borderColor: theme.colors.green,
  },
  exploreBarText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  exploreBarSpacer: {
    flex: 1,
  },
  explorerCount: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  descriptionSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text,
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 27,
    color: theme.colors.textSecondary,
  },

});
