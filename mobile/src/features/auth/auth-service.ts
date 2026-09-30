import * as WebBrowser from 'expo-web-browser';

import { authApi } from '@/services/api/client';
import {
  getRefreshToken,
  removeTokens,
  saveTokens,
} from '@/services/storage/auth-storage';

const GOOGLE_AUTH_URL =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_URL;

const GOOGLE_CALLBACK_URL = 'twende://auth/callback';

type LoginRequest = {
  identifier: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  displayName: string;
  profileImageUrl?: string | null;
};

export type GoogleProfileCompletionRequest = {
  setupToken: string;
  displayName: string;
  username: string;
  profileImage: string | null;
};

async function saveAuthTokens(data: {
  accessToken: string;
  refreshToken: string;
}) {
  await saveTokens(data.accessToken, data.refreshToken);
}

export async function login(data: LoginRequest) {
  const response = await authApi.post('/api/auth/login', data);

  await saveAuthTokens(response.data.data);

  return response.data.data;
}

export async function register(data: RegisterRequest) {
  const response = await authApi.post('/api/auth/register', data);

  await saveAuthTokens(response.data.data);

  return response.data.data;
}

export async function startGoogleLogin() {
  if (!GOOGLE_AUTH_URL) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_AUTH_URL is not configured.'
    );
  }

  return WebBrowser.openAuthSessionAsync(
    GOOGLE_AUTH_URL,
    GOOGLE_CALLBACK_URL
  );
}

export async function exchangeGoogleCode(code: string) {
  const response = await authApi.post('/api/auth/google/exchange', {
    code,
  });

  await saveAuthTokens(response.data.data);

  return response.data.data;
}

export async function completeGoogleProfile(
  data: GoogleProfileCompletionRequest
) {
  const response = await authApi.post(
    '/api/auth/google/complete',
    data
  );

  await saveAuthTokens(response.data.data);

  return response.data.data;
}

export async function logout() {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await authApi.post('/api/auth/logout', {
        refreshToken,
      });
    }
  } finally {
    await removeTokens();
  }
}
