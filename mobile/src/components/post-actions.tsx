import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { theme } from '@/theme';

type PostActionsProps = {
  visited?: boolean;
  visiting?: boolean;
  bookmarked?: boolean;
  onVisitedPress?: () => void;
  onBookmarkPress?: () => void;
};

export function PostActions({
  bookmarked = false,
  onBookmarkPress,
}: PostActionsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.bookmarkAction}
        onPress={onBookmarkPress}
        accessibilityRole="button"
        accessibilityLabel={
          bookmarked ? 'Remove saved place' : 'Save place'
        }
      >
        <Ionicons
          name={
            bookmarked
              ? 'bookmark'
              : 'bookmark-outline'
          }
          size={27}
          color={
            bookmarked
              ? theme.colors.accent
              : theme.colors.primary
          }
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  bookmarkAction: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
