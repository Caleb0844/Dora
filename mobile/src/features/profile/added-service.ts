import { api } from '@/services/api/client';

export type AddedPlace = {
  id: string;
  name: string;
  category: string;
  county: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type AddedPlacesPage = {
  content: AddedPlace[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function getAddedPlaces(
  page = 0,
  size = 20
): Promise<AddedPlacesPage> {
  const response = await api.get('/api/users/me/places', {
    params: { page, size },
  });

  return response.data.data;
}
