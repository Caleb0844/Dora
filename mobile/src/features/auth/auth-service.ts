import { authApi } from '@/services/api/client';
import {
  getRefreshToken,
  removeTokens,
  saveTokens,
} from '@/services/storage/auth-storage';

type LoginRequest = {
  identifier: string;
  password: string;
};

export async function login(data: LoginRequest) {
  const response = await authApi.post('/api/auth/login', data);

  const {
    accessToken,
    refreshToken,
  } = response.data.data;

  await saveTokens(accessToken, refreshToken);

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
