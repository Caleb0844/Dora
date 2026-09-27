import { Stack } from 'expo-router';

import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    />
  );
}
