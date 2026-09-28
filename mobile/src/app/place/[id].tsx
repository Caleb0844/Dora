import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  removeSavedPlace,
  savePlace,
} from '@/features/profile/saved-service';
import { getPlace } from '@/services/api/place-service';
import { useBookmarkStore } from '@/store/bookmarks';
import { theme } from '@/theme';

export default function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id;
  const { width: windowWidth } = useWindowDimensions();

  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const saveBookmark = useBookmarkStore((state) => state.saveBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const isBookmarked = placeId
    ? bookmarks[placeId] ?? Boolean(place?.bookmarked)
    : false;

  useEffect(() => {
    if (!placeId) {
      return;
    }

    async function loadPlace() {
      try {
        setLoading(true);
        const data = await getPlace(placeId);
        setPlace(data);
      } catch (error) {
        console.log('Failed to load place:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPlace();
  }, [placeId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.green} />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Place could not be loaded.</Text>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const images: string[] = place.images ?? [];

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {place.creator && (
          <View style={styles.creatorHeader}>
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
            <Text style={styles.headerUsername}>
              @{place.creator.username}
            </Text>
          </View>
        )}

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

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
          </Pressable>

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
          <View style={styles.titleRow}>
            <Text style={styles.title}>{place.name}</Text>

            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{place.category}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={23}
              color={theme.colors.green}
            />
            <Text style={styles.locationText}>{place.county}</Text>
            <Pressable
              style={styles.locationMapButton}
              accessibilityRole="button"
              accessibilityLabel="Open map"
              onPress={handleOpenMap}
            >
              <Ionicons
                name="map-outline"
                size={19}
                color={theme.colors.green}
              />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.saveButton,
              isBookmarked && styles.saveButtonSaved,
              savingBookmark && styles.saveButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Saved place' : 'Save place'}
            disabled={savingBookmark}
            onPress={async () => {
              if (!placeId || savingBookmark) {
                return;
              }

              const previousEffectiveValue =
                bookmarks[placeId] ?? Boolean(place?.bookmarked);
              const shouldSave = !previousEffectiveValue;

              setSavingBookmark(true);

              try {
                if (shouldSave) {
                  await saveBookmark(placeId);
                } else {
                  await removeBookmark(placeId);
                }
              } finally {
                setSavingBookmark(false);
              }
            }}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={21}
              color={theme.colors.white}
            />
            <Text style={styles.saveButtonText}>
              {isBookmarked ? 'Saved' : 'Save place'}
            </Text>
          </Pressable>

          {place.creator && (
            <View style={styles.creator}>
              <View style={styles.avatar}>
                {place.creator.profileImage ? (
                  <Image
                    source={{ uri: place.creator.profileImage }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                )}
              </View>

              <View>
                <Text style={styles.addedBy}>Added by</Text>
                <Text style={styles.creatorName}>
                  {place.creator.displayName ?? place.creator.username}
                </Text>
                {!!place.creator.username && (
                  <Text style={styles.creatorUsername}>
                    @{place.creator.username}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text style={styles.description}>{place.description}</Text>
          </View>

          <View style={styles.futureSection}>
            <Text style={styles.sectionTitle}>More on Twende</Text>
            <View style={styles.futureActions}>
              <View style={styles.futureCard}>
                <Ionicons name="star-outline" size={21} color={theme.colors.accent} />
                <Text style={styles.futureTitle}>Ratings</Text>
                <Text style={styles.futureText}>Coming later</Text>
              </View>
              <View style={styles.futureCard}>
                <Ionicons name="footsteps-outline" size={21} color={theme.colors.green} />
                <Text style={styles.futureTitle}>Visits</Text>
                <Text style={styles.futureText}>Coming later</Text>
              </View>
              <View style={styles.futureCard}>
                <Ionicons name="share-social-outline" size={21} color={theme.colors.info} />
                <Text style={styles.futureTitle}>Share</Text>
                <Text style={styles.futureText}>Coming later</Text>
              </View>
            </View>
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
  creatorHeader: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 12,
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
  headerUsername: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
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
  backButton: {
    position: 'absolute',
    top: 14,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  counter: {
    position: 'absolute',
    top: 14,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text,
  },
  categoryPill: {
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.green,
  },
  locationRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  locationMapButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  saveButton: {
    marginTop: 22,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 14,
    backgroundColor: theme.colors.green,
  },
  saveButtonSaved: {
    backgroundColor: theme.colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  creator: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSoft,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  addedBy: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  creatorName: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  creatorUsername: {
    marginTop: 3,
    fontSize: 13,
    color: theme.colors.greenMuted,
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
  futureSection: {
    marginTop: 34,
  },
  futureActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 9,
  },
  futureCard: {
    flex: 1,
    minHeight: 110,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  futureTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  futureText: {
    marginTop: 3,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
