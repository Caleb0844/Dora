import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfilePlaceGrid } from '@/components/profile-place-grid';
import {
  getPublicProfile,
  getPublicProfilePlaces,
  type PublicProfile,
  type PublicProfilePlace,
} from '@/features/profile/public-profile-service';
import { theme } from '@/theme';

const PAGE_SIZE = 12;

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [places, setPlaces] = useState<PublicProfilePlace[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setError('User not found.');
      setLoading(false);
      return;
    }

    loadInitial(username);
  }, [username]);

  async function loadInitial(targetUsername: string) {
    try {
      setLoading(true);
      setError(null);

      const [profileData, placesData] = await Promise.all([
        getPublicProfile(targetUsername),
        getPublicProfilePlaces(targetUsername, 0, PAGE_SIZE),
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
      setLoading(false);
    }
  }

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
        PAGE_SIZE
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
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (!profile || error) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        </View>

        <View style={styles.profileSection}>
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

          <Text style={styles.displayName}>
            {profile.displayName ?? 'Twende User'}
          </Text>

          <Text style={styles.username}>
            @{profile.username}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Places added
          </Text>

          <Text style={styles.placeCount}>
            {profile.placesContributed}
          </Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
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
  sectionHeader: {
    marginTop: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  placeCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
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
