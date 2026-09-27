import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  saveTokens,
} from '@/services/storage/auth-storage';

const BASE_URL = 'http://192.168.0.102:8080';

export const api = axios.create({
  baseURL: BASE_URL,
});

export const authApi = axios.create({
  baseURL: BASE_URL,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await removeTokens();
      return Promise.reject(error);
    }

    try {
      const response = await authApi.post('/api/auth/refresh', {
        refreshToken,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      } = response.data.data;

      await saveTokens(newAccessToken, newRefreshToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      await removeTokens();
      return Promise.reject(refreshError);
    }
  }
);
