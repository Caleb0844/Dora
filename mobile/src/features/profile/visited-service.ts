import { api } from '@/services/api/client';

export type CheckInResponse = {
  checkInId: string;
  checkedInAt: string;
  place: {
    id: string;
    name: string;
    category: string;
    county: string;
    latitude: number;
    longitude: number;
    images: string[];
    creator: {
      id: string;
      username: string;
      displayName: string;
      profileImage: string | null;
    };
  };
};

export type VisitedPlacesPage = {
  content: CheckInResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function getVisitedPlaces(
  page = 0,
  size = 20
): Promise<VisitedPlacesPage> {
  const response = await api.get('/api/checkins/me', {
    params: { page, size },
  });

  return response.data.data;
}

export async function getAllVisitedPlaceIds(): Promise<Set<string>> {
  const placeIds = new Set<string>();
  let page = 0;
  let isLastPage = false;

  while (!isLastPage) {
    const visitedPlaces = await getVisitedPlaces(page, 100);
    visitedPlaces.content.forEach((item) => placeIds.add(item.place.id));
    isLastPage = visitedPlaces.last;
    page += 1;
  }

  return placeIds;
}
