import * as SecureStore from 'expo-secure-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getFeed } from '@/services/api/feed-service';
import { AuthRequiredModal } from '@/components/auth-required-modal';
import { queryClient } from '@/services/query/query-client';
import { useAuthSessionStore } from '@/store/auth-session';
import { theme } from '@/theme';

const WELCOME_SEEN_KEY = 'twende_welcome_seen';
const HOME_COACH_PENDING_KEY = 'twende_home_coach_pending';

export default function RootLayout() {
  const hydrateAuth = useAuthSessionStore((state) => state.hydrate);

  const [startupChecked, setStartupChecked] = useState(false);
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      // Restore authentication in parallel. Home should not wait for it.
      void hydrateAuth();

      const welcomeSeen = await SecureStore.getItemAsync(
        WELCOME_SEEN_KEY
      );

      setFirstRun(welcomeSeen !== 'true');
      setStartupChecked(true);
    }

    void prepareApp();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!startupChecked || !firstRun) {
      return;
    }

    // Prepare the first Home page while the one-time Welcome screen is visible.
    void queryClient.prefetchInfiniteQuery({
      queryKey: ['feed', 'home', 'infinite'],
      queryFn: ({ pageParam }) => getFeed(pageParam.page, 10),
      initialPageParam: {
        page: 0,
        cycle: 0,
      },
      getNextPageParam: (
        lastPage: Awaited<ReturnType<typeof getFeed>>,
        _allPages: Awaited<ReturnType<typeof getFeed>>[],
        lastPageParam: {
          page: number;
          cycle: number;
        }
      ) => {
        if (lastPage.totalElements === 0) {
          return undefined;
        }

        if (lastPage.last) {
          return {
            page: 0,
            cycle: lastPageParam.cycle + 1,
          };
        }

        return {
          page: lastPage.page + 1,
          cycle: lastPageParam.cycle,
        };
      },
      staleTime: 5 * 60_000,
    });

    const timer = setTimeout(() => {
      void Promise.all([
        SecureStore.setItemAsync(WELCOME_SEEN_KEY, 'true'),
        SecureStore.setItemAsync(HOME_COACH_PENDING_KEY, 'true'),
      ]);

      setFirstRun(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, [firstRun, startupChecked]);

  if (!startupChecked) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
          translucent={false}
        />

        <View style={styles.boot}>
        <ActivityIndicator
          size="large"
          color={theme.colors.accent}
        />
        </View>
      </>
    );
  }

  if (firstRun) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
          translucent={false}
        />

        <View style={styles.welcome}>
        <Text style={styles.welcomeLogo}>Twende</Text>

        <Text style={styles.welcomeTitle}>
          Welcome to Twende
        </Text>

        <Text style={styles.welcomeText}>
          Discover places worth going.
        </Text>

        <ActivityIndicator
          style={styles.welcomeLoader}
          color={theme.colors.accent}
        />
        </View>
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={false}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />

      <AuthRequiredModal />
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
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: theme.colors.background,
  },
  welcomeLogo: {
    color: theme.colors.accent,
    fontSize: 42,
    fontWeight: '900',
  },
  welcomeTitle: {
    marginTop: 18,
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  welcomeLoader: {
    marginTop: 28,
  },
});
