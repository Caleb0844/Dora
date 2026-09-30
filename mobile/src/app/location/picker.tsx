import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocationSelectionStore } from '@/store/location-selection';
import { theme } from '@/theme';

type Coordinate = {
  latitude: number;
  longitude: number;
};

function distanceInMeters(a: Coordinate, b: Coordinate) {
  const earthRadius = 6371000;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  );
}

export default function LocationPickerScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [gpsOrigin, setGpsOrigin] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const setSelectedLocation =
    useLocationSelectionStore((state) => state.setSelectedLocation);

  useEffect(() => {
    async function loadCurrentLocation() {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          Alert.alert(
            'Location permission required',
            'Twende needs your location to position the map.'
          );
          router.back();
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const origin = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setAccuracy(location.coords.accuracy ?? null);
        setGpsOrigin(origin);

        setRegion({
          ...origin,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        });
      } catch (error) {
        console.log('Failed to get location:', error);

        Alert.alert(
          'Location error',
          'Could not get your current location.'
        );

        router.back();
      } finally {
        setLoading(false);
      }
    }

    void loadCurrentLocation();
  }, []);

  const allowedRadius = useMemo(() => {
    if (accuracy === null) {
      return 200;
    }

    return Math.max(200, accuracy * 2);
  }, [accuracy]);

  const movedDistance = useMemo(() => {
    if (!region || !gpsOrigin) {
      return 0;
    }

    return distanceInMeters(gpsOrigin, region);
  }, [region, gpsOrigin]);

  const outsideAllowedRadius = movedDistance > allowedRadius;

  if (loading || !region || !gpsOrigin) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={theme.colors.green}
        />
        <Text style={styles.loadingText}>
          Finding your location...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={theme.colors.text}
          />
        </Pressable>

        <Text style={styles.title}>Choose location</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          mapType="hybrid"
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton
        >
          <Circle
            center={gpsOrigin}
            radius={allowedRadius}
            strokeWidth={2}
            strokeColor="rgba(255,255,255,0.9)"
            fillColor="rgba(255,255,255,0.08)"
          />
        </MapView>

        <View
          pointerEvents="none"
          style={styles.centerPin}
        >
          <Ionicons
            name="location"
            size={42}
            color={
              outsideAllowedRadius
                ? '#E5484D'
                : theme.colors.green
            }
          />
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.coordinateText}>
          {region.latitude.toFixed(6)}, {region.longitude.toFixed(6)}
        </Text>

        {accuracy !== null && (
          <Text style={styles.accuracyText}>
            GPS accuracy approximately ±{Math.round(accuracy)} m
          </Text>
        )}

        <Text style={styles.accuracyText}>
          Adjustment limit: {Math.round(allowedRadius)} m
        </Text>

        <Text
          style={[
            styles.distanceText,
            outsideAllowedRadius && styles.distanceInvalid,
          ]}
        >
          Moved {Math.round(movedDistance)} m from your GPS location
        </Text>

        <Text style={styles.helperText}>
          Move the satellite map until the exact place is under the pin.
        </Text>

        {outsideAllowedRadius && (
          <Text style={styles.warningText}>
            Move the pin closer to your current GPS location.
          </Text>
        )}

        <Pressable
          style={[
            styles.continueButton,
            outsideAllowedRadius && styles.continueDisabled,
          ]}
          disabled={outsideAllowedRadius}
          onPress={() => {
            setSelectedLocation({
              latitude: Number(region.latitude.toFixed(6)),
              longitude: Number(region.longitude.toFixed(6)),
            });

            router.back();
          }}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginLeft: 8,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -21,
    marginTop: -42,
  },
  bottomPanel: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: theme.colors.surface,
  },
  coordinateText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  accuracyText: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  distanceText: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  distanceInvalid: {
    color: '#E5484D',
  },
  helperText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    marginTop: 6,
    color: '#E5484D',
    fontSize: 13,
    fontWeight: '700',
  },
  continueButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  continueText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
