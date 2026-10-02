import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuthIntentStore } from '@/store/auth-intent';
import { useAuthSessionStore } from '@/store/auth-session';
import { theme } from '@/theme';

const items = {
  index: {
    icon: 'home-outline',
    activeIcon: 'home',
  },
  'nearby/index': {
    icon: 'location-outline',
    activeIcon: 'location',
  },
  'add/index': {
    icon: 'add',
    activeIcon: 'add',
    protectedRoute: '/add' as const,
  },
  'collab/index': {
    icon: 'people-outline',
    activeIcon: 'people',
  },
  'profile/index': {
    icon: 'person-outline',
    activeIcon: 'person',
    protectedRoute: '/profile' as const,
  },
} as const;

type TabRoute = {
  key: string;
  name: string;
};

type BottomNavProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function BottomNav({
  state,
  navigation,
}: BottomNavProps) {
  const setIntent = useAuthIntentStore((store) => store.setIntent);
  const authStatus = useAuthSessionStore((store) => store.status);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const item = items[route.name as keyof typeof items];

        if (!item) {
          return null;
        }

        const active = state.index === index;

        return (
          <Pressable
            key={route.key}
            style={styles.item}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (event.defaultPrevented) {
                return;
              }

              if (
                'protectedRoute' in item &&
                authStatus !== 'authenticated'
              ) {
                setIntent({
                  type: 'route',
                  route: item.protectedRoute,
                });

                router.push('/login');
                return;
              }

              if (!active) {
                navigation.navigate(route.name);
              }
            }}
            accessibilityRole="button"
          >
            {route.name === 'add/index' ? (
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
                color={
                  active
                    ? theme.colors.green
                    : theme.colors.muted
                }
              />
            )}
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
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
});
