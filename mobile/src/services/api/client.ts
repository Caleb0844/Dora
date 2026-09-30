import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

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

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshAuthSession(): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available.');
      }

      const response = await authApi.post('/api/auth/refresh', {
        refreshToken,
      });

      const tokens = response.data.data as AuthTokens;

      await saveTokens(
        tokens.accessToken,
        tokens.refreshToken
      );

      return tokens;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.request.use(
  async (config: RetryableRequestConfig) => {
    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * The request may have been sent with an older access token while
       * another login/refresh already installed a newer one.
       *
       * Retry using the newest token before starting another refresh.
       */
      const currentAccessToken = await getAccessToken();
      const requestAuthorization =
        originalRequest.headers?.Authorization;

      if (
        currentAccessToken &&
        requestAuthorization !==
          `Bearer ${currentAccessToken}`
      ) {
        originalRequest.headers.Authorization =
          `Bearer ${currentAccessToken}`;

        return api(originalRequest);
      }

      /*
       * All simultaneous 401 responses share this single refresh.
       * This prevents refresh-token rotation races.
       */
      const tokens = await refreshAuthSession();

      originalRequest.headers.Authorization =
        `Bearer ${tokens.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      await removeTokens();
      return Promise.reject(refreshError);
    }
  }
);
