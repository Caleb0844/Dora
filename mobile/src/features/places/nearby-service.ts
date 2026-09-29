import { api } from '@/services/api/client';

type NearbyParams = {
  latitude: number;
  longitude: number;
  radius: number;
  size?: number;
};

export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  county: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  thumbnailUrl: string | null;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string | null;
  creatorProfileImage: string | null;
};

export type NearbyPlacesResponse = {
  radiusKm: number;
  places: NearbyPlace[];
};

export async function getNearbyPlaces({
  latitude,
  longitude,
  radius,
  size = 20,
}: NearbyParams): Promise<NearbyPlacesResponse> {
  const response = await api.get('/api/places/nearby', {
    params: {
      latitude,
      longitude,
      radius,
      size,
    },
  });

  return response.data.data;
}
