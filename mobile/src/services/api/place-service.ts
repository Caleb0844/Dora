import { api } from './client';

export type CreatePlaceRequest = {
  name: string;
  category: string;
  countyCode: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
};

export async function createPlace(data: CreatePlaceRequest) {
  const response = await api.post('/api/places', data);
  return response.data.data;
}

export async function deletePlace(placeId: string) {
  await api.delete(`/api/places/${placeId}`);
}

export async function getPlace(placeId: string) {
  const response = await api.get(`/api/places/${placeId}`);
  return response.data.data;
}

export async function updatePlace(
  placeId: string,
  data: CreatePlaceRequest
) {
  const response = await api.put(`/api/places/${placeId}`, data);
  return response.data.data;
}
