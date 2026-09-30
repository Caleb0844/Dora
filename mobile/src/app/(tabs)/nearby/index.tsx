import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { TwendePost } from '@/components/twende-post';
import {
  getNearbyPlaces,
  type NearbyPlace,
} from '@/features/places/nearby-service';
import { checkInPlace } from '@/features/profile/check-in-service';
import { getAllVisitedPlaceIds } from '@/features/profile/visited-service';
import { getCurrentLocation } from '@/services/location/location-service';
import { theme } from '@/theme';

const distances = ['1', '5', '10', '15', '20', '30', '40', 'Custom', 'All'];



export default function NearbyScreen() {
  const [selected, setSelected] = useState('20');
  const [distanceMenuOpen, setDistanceMenuOpen] = useState(false);
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(new Set());
  const checkingInIdsRef = useRef<Set<string>>(new Set());
  const radius =
    selected === 'Custom' ? null : Number(selected);

  const locationQuery = useQuery({
    queryKey: ['location', 'current'],
    queryFn: getCurrentLocation,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  const nearbyQuery = useQuery({
    queryKey: [
      'nearby',
      locationQuery.data?.latitude ?? null,
      locationQuery.data?.longitude ?? null,
      radius,
    ],
    queryFn: () =>
      getNearbyPlaces({
        latitude: locationQuery.data!.latitude,
        longitude: locationQuery.data!.longitude,
        radius: radius!,
        size: 20,
      }),
    enabled:
      !!locationQuery.data &&
      radius !== null &&
      Number.isFinite(radius),
    staleTime: 2 * 60_000,
  });

  const places: NearbyPlace[] =
    nearbyQuery.data?.places ?? [];

  const loading =
    locationQuery.isPending || nearbyQuery.isPending;

  const error =
    locationQuery.error || nearbyQuery.error;

  const queryClient = useQueryClient();

  const visitedIdsQuery = useQuery({
    queryKey: ['profile', 'me', 'visited-ids'],
    queryFn: async () => {
      try {
        return await getAllVisitedPlaceIds();
      } catch (error: any) {
        // Nearby is public. Guests simply have no authenticated visit history.
        if (error?.response?.status === 401) {
          return new Set<string>();
        }

        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

  const visitedIds =
    visitedIdsQuery.data ?? new Set<string>();

  async function handleVisitedPress(placeId: string) {
    if (visitedIds.has(placeId) || checkingInIdsRef.current.has(placeId)) {
      return;
    }

    checkingInIdsRef.current.add(placeId);
    setCheckingInIds(new Set(checkingInIdsRef.current));

    try {
      await checkInPlace(placeId);

      queryClient.setQueryData<Set<string>>(
        ['profile', 'me', 'visited-ids'],
        (current) => {
          const next = new Set(current ?? []);
          next.add(placeId);
          return next;
        }
      );

      await queryClient.invalidateQueries({
        queryKey: ['profile', 'me', 'visited'],
      });
    } catch {
      Alert.alert('Check-in failed', 'Please try again.');
    } finally {
      checkingInIdsRef.current.delete(placeId);
      setCheckingInIds(new Set(checkingInIdsRef.current));
    }
  }

  function handleDistancePress(distance: string) {
    setDistanceMenuOpen(false);

    if (distance === 'All') {
      router.replace('/');
      return;
    }

    if (distance === 'Custom') {
      setSelected('Custom');
      return;
    }

    setSelected(distance);
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.title}>Places Near You</Text>

          <Pressable
            style={styles.distanceSelector}
            onPress={() =>
              setDistanceMenuOpen((current) => !current)
            }
          >
            <Text style={styles.distanceSelectorText}>
              {selected === 'Custom' || selected === 'All'
                ? selected
                : `${selected} km`}
            </Text>

            <Text style={styles.chevron}>
              {distanceMenuOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
        </View>

        {distanceMenuOpen && (
          <View style={styles.distanceMenu}>
            {distances.map((distance) => (
              <Pressable
                key={distance}
                style={[
                  styles.distanceOption,
                  selected === distance &&
                    styles.activeDistanceOption,
                ]}
                onPress={() =>
                  handleDistancePress(distance)
                }
              >
                <Text
                  style={[
                    styles.distanceOptionText,
                    selected === distance &&
                      styles.activeDistanceOptionText,
                  ]}
                >
                  {distance === 'Custom' || distance === 'All'
                    ? distance
                    : `${distance} km`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {(error as any)?.message ?? 'Unable to load nearby places.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No places found in this radius.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TwendePost
              id={item.id}
              name={item.name}
              category={item.category}
              county={item.county}
              distanceKm={item.distanceKm}
              thumbnailUrl={item.thumbnailUrl}
              creatorUsername={item.creatorUsername}
              creatorDisplayName={item.creatorDisplayName}
              creatorProfileImage={item.creatorProfileImage}
              visited={visitedIds.has(item.id)}
              visiting={visitedIdsQuery.isPending || checkingInIds.has(item.id)}
              onVisitedPress={handleVisitedPress}
            />
          )}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    zIndex: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  distanceSelector: {
    minWidth: 105,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  distanceSelectorText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  distanceMenu: {
    position: 'absolute',
    top: 62,
    right: 16,
    width: 130,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    zIndex: 20,
  },
  distanceOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activeDistanceOption: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  distanceOptionText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  activeDistanceOptionText: {
    color: theme.colors.green,
    fontWeight: '800',
  },
  filterText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: theme.colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: theme.colors.danger,
    textAlign: 'center',
  },
  empty: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
