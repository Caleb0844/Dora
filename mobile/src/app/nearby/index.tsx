import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRef } from 'react';
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
import { BottomNav } from '@/components/bottom-nav';
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
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [visitedIdsLoaded, setVisitedIdsLoaded] = useState(false);
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(new Set());
  const checkingInIdsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadNearby(radius: number) {
    try {
      setLoading(true);
      setError('');

      const location = await getCurrentLocation();

      const data = await getNearbyPlaces({
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        size: 20,
      });

      setPlaces(data.places ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load nearby places.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNearby(20);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadVisited() {
      try {
        const placeIds = await getAllVisitedPlaceIds();
        if (isActive) {
          setVisitedIds(placeIds);
          setVisitedIdsLoaded(true);
        }
      } catch {
        Alert.alert('Unable to load visits', 'Check-ins are temporarily unavailable.');
      }
    }

    loadVisited();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleVisitedPress(placeId: string) {
    if (visitedIds.has(placeId) || checkingInIdsRef.current.has(placeId)) {
      return;
    }

    checkingInIdsRef.current.add(placeId);
    setCheckingInIds(new Set(checkingInIdsRef.current));

    try {
      await checkInPlace(placeId);
      setVisitedIds((current) => new Set(current).add(placeId));
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
    loadNearby(Number(distance));
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
          <Text style={styles.error}>{error}</Text>
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
              visiting={!visitedIdsLoaded || checkingInIds.has(item.id)}
              onVisitedPress={handleVisitedPress}
            />
          )}
        />
      )}

      <BottomNav />
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
