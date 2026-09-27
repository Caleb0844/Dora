import { Image, StyleSheet, Text, View } from 'react-native';

import { PostActions } from '@/components/post-actions';
import { theme } from '@/theme';

type TwendePostProps = {
  id: string;
  name: string;
  category: string;
  county: string;
  distanceKm?: number | null;
  visited?: boolean;
  visiting?: boolean;
  bookmarked?: boolean;
  onVisitedPress?: (placeId: string) => void;
  onBookmarkPress?: (placeId: string) => void;
};

export function TwendePost({
  id,
  name,
  category,
  county,
  distanceKm,
  visited = false,
  visiting = false,
  bookmarked = false,
  onVisitedPress,
  onBookmarkPress,
}: TwendePostProps) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={styles.avatar} />

        <View style={styles.creatorInfo}>
          <Text style={styles.creator}>Twende Explorer</Text>

          <Text style={styles.location}>
            {county}
            {distanceKm != null
              ? ` · ${distanceKm.toFixed(1)} km away`
              : ''}
          </Text>
        </View>
      </View>

      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
        }}
        style={styles.image}
      />

      <PostActions
        visited={visited}
        visiting={visiting}
        bookmarked={bookmarked}
        onVisitedPress={() => onVisitedPress?.(id)}
        onBookmarkPress={() => onBookmarkPress?.(id)}
      />

      <View style={styles.details}>
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.category}>{category}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: theme.colors.surface,
    marginBottom: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.green,
    marginRight: 10,
  },
  creatorInfo: {
    flex: 1,
  },
  creator: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  location: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  image: {
    width: '100%',
    height: 360,
    backgroundColor: theme.colors.border,
  },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  category: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.accent,
  },
});
