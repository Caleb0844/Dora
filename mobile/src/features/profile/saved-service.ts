import { api } from '@/services/api/client';

export type SavedPlace = {
  placeId: string;
  bookmarkedAt: string;
  place: {
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
};

export type SavedPlacesPage = {
  content: SavedPlace[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function getSavedPlaces(
  page = 0,
  size = 8,
  search = '',
  sortField: 'name' | 'date' = 'date',
  sortDirection: 'asc' | 'desc' = 'desc'
): Promise<SavedPlacesPage> {
  const response = await api.get('/api/bookmarks', {
    params: {
      page,
      size,
      q: search,
      sortField,
      sortDirection,
    },
  });

  return response.data.data;
}

export async function removeSavedPlace(placeId: string) {
  await api.delete(`/api/bookmarks/${placeId}`);
}

export async function savePlace(placeId: string) {
  await api.post(`/api/bookmarks/${placeId}`);
}
