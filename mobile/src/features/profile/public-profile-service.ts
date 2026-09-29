import { api } from '@/services/api/client';
import type {
  AddedPlace,
  AddedPlacesPage,
} from '@/features/profile/added-service';

export type PublicProfile = {
  username: string;
  displayName: string | null;
  profileImage: string | null;
  points: number;
  placesContributed: number;
  placesVisited: number;
};

export async function getPublicProfile(
  username: string
): Promise<PublicProfile> {
  const response = await api.get(
    `/api/users/${encodeURIComponent(username)}`
  );

  return response.data.data;
}

export async function getPublicProfilePlaces(
  username: string,
  page = 0,
  size = 12
): Promise<AddedPlacesPage> {
  const response = await api.get(
    `/api/users/${encodeURIComponent(username)}/places`,
    {
      params: { page, size },
    }
  );

  return response.data.data;
}

export type PublicProfilePlace = AddedPlace;
