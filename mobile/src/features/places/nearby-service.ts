import { api } from '@/services/api/client';

type NearbyParams = {
  latitude: number;
  longitude: number;
  radius: number;
  size?: number;
};

export async function getNearbyPlaces({
  latitude,
  longitude,
  radius,
  size = 20,
}: NearbyParams) {
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
