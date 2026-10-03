import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

export type ProfilePlaceTab =
  | 'saved'
  | 'added'
  | 'visited'
  | 'list';

type Props = {
  activeTab: ProfilePlaceTab;
  onChange: (tab: ProfilePlaceTab) => void;
  fullBleed?: boolean;
};

const tabs = [
  {
    key: 'saved',
    icon: 'bookmark-outline',
    activeIcon: 'bookmark',
  },
  {
    key: 'added',
    icon: 'add-outline',
    activeIcon: 'add',
  },
  {
    key: 'visited',
    icon: 'checkmark-outline',
    activeIcon: 'checkmark',
  },
  {
    key: 'list',
    icon: 'list-outline',
    activeIcon: 'list',
  },
] as const;

export function ProfilePlaceTabs({
  activeTab,
  onChange,
  fullBleed = false,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        fullBleed && styles.fullBleed,
      ]}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={23}
              color={
                active
                  ? theme.colors.text
                  : theme.colors.textSecondary
              }
            />

            <View
              style={[
                styles.indicator,
                active && styles.activeIndicator,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fullBleed: {
    marginHorizontal: -16,
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  activeIndicator: {
    backgroundColor: theme.colors.accent,
  },
});
