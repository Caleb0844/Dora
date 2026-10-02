import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthIntentStore } from '@/store/auth-intent';
import { useAuthPromptStore } from '@/store/auth-prompt';
import { useAuthSessionStore } from '@/store/auth-session';
import { useHomeChromeStore } from '@/store/home-chrome';
import { theme } from '@/theme';

const HOME_COACH_PENDING_KEY = 'twende_home_coach_pending';

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

type CoachStep = 'nearby' | 'add';

type TargetLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function BottomNav({
  state,
  navigation,
}: BottomNavProps) {
  const setIntent = useAuthIntentStore((store) => store.setIntent);
  const openAuthPrompt = useAuthPromptStore(
    (store) => store.openPrompt
  );
  const authStatus = useAuthSessionStore((store) => store.status);
  const homeBottomNavVisible = useHomeChromeStore(
    (store) => store.bottomNavVisible
  );

  const activeRouteName = state.routes[state.index]?.name;

  const navTranslateY = useSharedValue(0);

  useEffect(() => {
    const shouldShow =
      activeRouteName !== 'index' ||
      homeBottomNavVisible;

    navTranslateY.value = withTiming(
      shouldShow ? 0 : 80,
      {
        duration: shouldShow ? 180 : 160,
      }
    );
  }, [
    activeRouteName,
    homeBottomNavVisible,
    navTranslateY,
  ]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: navTranslateY.value,
      },
    ],
  }));

  const nearbyRef = useRef<View>(null);
  const addRef = useRef<View>(null);

  const [coachStep, setCoachStep] =
    useState<CoachStep | null>(null);

  const [target, setTarget] =
    useState<TargetLayout | null>(null);

  useEffect(() => {
    async function loadCoachState() {
      try {
        const pending = await SecureStore.getItemAsync(
          HOME_COACH_PENDING_KEY
        );

        if (pending === 'true') {
          setCoachStep('nearby');
        }
      } catch (error) {
        console.log('Could not load home coach state:', error);
      }
    }

    void loadCoachState();
  }, []);

  useEffect(() => {
    if (!coachStep) {
      return;
    }

    const timer = setTimeout(() => {
      const targetRef =
        coachStep === 'nearby'
          ? nearbyRef.current
          : addRef.current;

      targetRef?.measureInWindow(
        (x, y, width, height) => {
          setTarget({
            x,
            y,
            width,
            height,
          });
        }
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [coachStep]);

  async function advanceCoach() {
    if (coachStep === 'nearby') {
      setCoachStep('add');
      return;
    }

    if (coachStep === 'add') {
      setCoachStep(null);
      setTarget(null);

      try {
        await SecureStore.deleteItemAsync(
          HOME_COACH_PENDING_KEY
        );
      } catch (error) {
        console.log('Could not finish home coach:', error);
      }
    }
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
        ]}
      >
        {state.routes.map((route, index) => {
          const item = items[route.name as keyof typeof items];

          if (!item) {
            return null;
          }

          const active = state.index === index;

          const content = (
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

                  openAuthPrompt(
                    item.protectedRoute === '/add'
                      ? 'add'
                      : 'profile'
                  );

                  return;
                }

                if (!active) {
                  navigation.navigate(route.name);
                }
              }}
              accessibilityRole="button"
            >
              {route.name === 'index' ? (
                <MaterialCommunityIcons
                  name={
                    active
                      ? 'home-variant'
                      : 'home-variant-outline'
                  }
                  size={26}
                  color={
                    active
                      ? theme.colors.green
                      : '#F2F4F7'
                  }
                />
              ) : (
                <Ionicons
                  name={
                    route.name === 'add/index'
                      ? 'add-circle-outline'
                      : active
                        ? item.activeIcon
                        : item.icon
                  }
                  size={
                    route.name === 'add/index'
                      ? 28
                      : 25
                  }
                  color={
                    active
                      ? theme.colors.green
                      : '#F2F4F7'
                  }
                />
              )}
            </Pressable>
          );

          if (route.name === 'nearby/index') {
            return (
              <View
                key={route.key}
                ref={nearbyRef}
                style={styles.itemWrapper}
                collapsable={false}
              >
                {content}
              </View>
            );
          }

          if (route.name === 'add/index') {
            return (
              <View
                key={route.key}
                ref={addRef}
                style={styles.itemWrapper}
                collapsable={false}
              >
                {content}
              </View>
            );
          }

          return (
            <View
              key={route.key}
              style={styles.itemWrapper}
            >
              {content}
            </View>
          );
        })}
      </Animated.View>

      <Modal
        visible={coachStep !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <Pressable
          style={styles.coachBackdrop}
          onPress={() => {
            void advanceCoach();
          }}
        >
          {target && coachStep ? (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.coachBubble,
                  {
                    top: Math.max(80, target.y - 155),
                    left: Math.max(
                      18,
                      Math.min(
                        target.x + target.width / 2 - 120,
                        120
                      )
                    ),
                  },
                ]}
              >
                <Text style={styles.coachTitle}>
                  {coachStep === 'nearby'
                    ? 'Find places near you'
                    : 'Add a place'}
                </Text>

                <Text style={styles.coachText}>
                  {coachStep === 'nearby'
                    ? 'Discover places around your current location.'
                    : 'Share a place you think others should discover.'}
                </Text>

                <Ionicons
                  name="arrow-down"
                  size={30}
                  color={theme.colors.white}
                  style={styles.coachArrow}
                />
              </View>

              <View
                pointerEvents="none"
                style={[
                  styles.highlightCircle,
                  {
                    left:
                      target.x +
                      target.width / 2 -
                      36,
                    top:
                      target.y +
                      target.height / 2 -
                      36,
                  },
                ]}
              >
                {coachStep === 'nearby' ? (
                  <Ionicons
                    name="location"
                    size={28}
                    color={theme.colors.green}
                  />
                ) : (
                  <View style={styles.highlightAdd}>
                    <Ionicons
                      name="add"
                      size={30}
                      color={theme.colors.white}
                    />
                  </View>
                )}
              </View>

              <Text
                pointerEvents="none"
                style={styles.coachContinue}
              >
                Tap anywhere to continue
              </Text>
            </>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
    backgroundColor: '#0B0F14',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#252A31',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemWrapper: {
    flex: 1,
    height: '100%',
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  highlightCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightAdd: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  coachBubble: {
    position: 'absolute',
    width: 240,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
  },
  coachTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  coachText: {
    marginTop: 7,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  coachArrow: {
    position: 'absolute',
    bottom: -42,
  },
  coachContinue: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    textAlign: 'center',
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
