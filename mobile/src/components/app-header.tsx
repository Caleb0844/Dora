import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Twende Trails</Text>
      <Text style={styles.tagline}>FEEL THE ADVENTURE</Text>
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
