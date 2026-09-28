import { api } from './client';

export type PlaceCreator = {
  id: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
};

export type PlaceDetails = {
  id: string;
  name: string;
  category: string;
  county: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
  bookmarked: boolean;
  explored: boolean;
  explorerCount: number;
  creator: PlaceCreator;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlaceRequest = {
  name: string;
  category: string;
  countyCode: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
};

export async function createPlace(data: CreatePlaceRequest): Promise<PlaceDetails> {
  const response = await api.post('/api/places', data);
  return response.data.data;
}

export async function deletePlace(placeId: string): Promise<void> {
  await api.delete(`/api/places/${placeId}`);
}

export async function getPlace(placeId: string): Promise<PlaceDetails> {
  const response = await api.get(`/api/places/${placeId}`);
  return response.data.data;
}

export async function updatePlace(
  placeId: string,
  data: CreatePlaceRequest
): Promise<PlaceDetails> {
  const response = await api.put(`/api/places/${placeId}`, data);
  return response.data.data;
}
