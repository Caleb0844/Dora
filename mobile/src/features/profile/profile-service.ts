import { api } from '@/services/api/client';

export type MyProfile = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  profileImage: string | null;
  points: number;
  placesContributed: number;
  placesVisited: number;
  createdAt: string;
};

export type UpdateMyProfileRequest = {
  displayName: string;
  username: string;
  profileImageUrl: string | null;
};

export async function getMyProfile(): Promise<MyProfile> {
  const response = await api.get('/api/users/me');
  return response.data.data;
}

export async function updateMyProfile(
  request: UpdateMyProfileRequest
): Promise<MyProfile> {
  const response = await api.put('/api/users/me', request);
  return response.data.data;
}
