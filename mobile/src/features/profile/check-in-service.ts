import { api } from '@/services/api/client';

export async function checkInPlace(placeId: string): Promise<void> {
  await api.post(`/api/checkins/${encodeURIComponent(placeId)}`);
}