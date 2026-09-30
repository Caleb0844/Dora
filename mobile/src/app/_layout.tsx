import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { queryClient } from '@/services/query/query-client';
import { theme } from '@/theme';

export default function RootLayout() {
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
