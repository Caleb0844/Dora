import { api } from './client';

export type FeedCreator = {
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
};

export type FeedPost = {
  id: string;
  name: string;
  description: string;
  category: string;
  county: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  images: string[];
  creator: FeedCreator;
  bookmarked: boolean;
  visited: boolean;
};

export type FeedPage = {
  content: FeedPost[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function getFeed(
  page = 0,
  size = 10
): Promise<FeedPage> {
  const response = await api.get('/api/feed', {
    params: { page, size },
  });

  return response.data.data;
}
