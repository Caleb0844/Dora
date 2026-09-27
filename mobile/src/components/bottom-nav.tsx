import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

const items = [
  { label: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
  { label: 'Near You', icon: 'location-outline', activeIcon: 'location', route: '/nearby' },
  { label: 'Add', icon: 'add', activeIcon: 'add', route: '/add' },
  { label: 'Collab', icon: 'people-outline', activeIcon: 'people', route: '/collab' },
  { label: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/profile' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const active =
          item.route === '/'
            ? pathname === '/'
            : pathname.startsWith(item.route);

        return (
          <Pressable
            key={item.label}
            style={styles.item}
            onPress={() => router.replace(item.route)}
          >
            {item.label === 'Add' ? (
              <View style={styles.addButton}>
                <Ionicons
                  name="add"
                  size={28}
                  color={theme.colors.white}
                />
              </View>
            ) : (
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={23}
                color={active ? theme.colors.green : theme.colors.muted}
              />
            )}

            <Text
              style={[
                styles.label,
                active && styles.activeLabel,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 74,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  activeLabel: {
    color: theme.colors.green,
  },
});
