import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { queryClient } from '@/services/query/query-client';
import { useAuthSessionStore } from '@/store/auth-session';
import { theme } from '@/theme';

export default function RootLayout() {
  const authStatus = useAuthSessionStore((state) => state.status);
  const hydrateAuth = useAuthSessionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  if (authStatus === 'checking') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator
          size="large"
          color={theme.colors.accent}
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
