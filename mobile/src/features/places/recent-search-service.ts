import * as SecureStore from 'expo-secure-store';

const RECENT_PLACES_KEY = 'twende_recent_places';
const MAX_RECENTS = 4;

export type RecentPlace = {
  id: string;
  name: string;
  category: string;
  county: string;
  thumbnailUrl: string | null;
};

export async function getRecentPlaces(): Promise<RecentPlace[]> {
  const stored = await SecureStore.getItemAsync(RECENT_PLACES_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export async function addRecentPlace(
  place: RecentPlace
): Promise<RecentPlace[]> {
  const current = await getRecentPlaces();

  const updated = [
    place,
    ...current.filter((item) => item.id !== place.id),
  ].slice(0, MAX_RECENTS);

  await SecureStore.setItemAsync(
    RECENT_PLACES_KEY,
    JSON.stringify(updated)
  );

  return updated;
}
