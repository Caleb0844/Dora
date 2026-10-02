import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { resetAccountScopedState } from '@/features/auth/session-state';
import { authApi } from '@/services/api/client';
import {
  getRefreshToken,
  removeTokens,
  saveTokens,
} from '@/services/storage/auth-storage';
import { useAuthSessionStore } from '@/store/auth-session';

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

  useAuthSessionStore.getState().setAuthenticated();

  // A new authenticated identity must never inherit guest/previous-user
  // viewer state. Preserve auth intent so resumeAfterAuth() can finish it.
  await resetAccountScopedState({
    refreshFeed: true,
  });
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

  if (Platform.OS === 'android') {
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      // No previous auth session is active.
    }
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

  // Local logout is the user-facing action.
  // Do this first so the UI can become guest immediately.
  useAuthSessionStore.getState().setGuest();
  await removeTokens();

  // Server-side refresh-token revocation is cleanup and must not
  // hold the user on Profile while the network responds.
  if (refreshToken) {
    void authApi
      .post('/api/auth/logout', {
        refreshToken,
      })
      .catch((error) => {
        console.log(
          'Remote logout cleanup failed:',
          error?.response?.data ?? error?.message
        );
      });
  }
}
