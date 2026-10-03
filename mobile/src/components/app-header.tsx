import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type AppHeaderProps = {
  rightAction?: ReactNode;
};

export function AppHeader({ rightAction }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.brand}>Twende Trails</Text>
        <Text style={styles.tagline}>FEEL THE ADVENTURE</Text>
      </View>

      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
  },
  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tagline: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: theme.colors.accent,
  },
});
