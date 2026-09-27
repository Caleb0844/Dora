import { api } from './client';

export type Category = {
  slug: string;
  name: string;
};

export type County = {
  code: string;
  name: string;
};

export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/api/categories');
  return response.data.data;
}

export async function getCounties(): Promise<County[]> {
  const response = await api.get('/api/counties');
  return response.data.data;
}
