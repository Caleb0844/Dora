import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type PostActionsProps = {
  visited?: boolean;
  visiting?: boolean;
  bookmarked?: boolean;
  onVisitedPress?: () => void;
  onBookmarkPress?: () => void;
};

export function PostActions({
  visited = false,
  visiting = false,
  bookmarked = false,
  onVisitedPress,
  onBookmarkPress,
}: PostActionsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Pressable
          style={styles.action}
          onPress={onVisitedPress}
          disabled={visited || visiting}
        >
          <Ionicons
            name={visited ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={25}
            color={visited ? theme.colors.accent : theme.colors.primary}
          />
          <Text style={styles.label}>Visited</Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Ionicons
            name="information-circle-outline"
            size={25}
            color={theme.colors.primary}
          />
          <Text style={styles.label}>Details</Text>
        </Pressable>
      </View>

      <Pressable onPress={onBookmarkPress}>
        <Ionicons
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={26}
          color={bookmarked ? theme.colors.accent : theme.colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: theme.colors.surface,
  },
  left: {
    flexDirection: 'row',
    gap: 22,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
