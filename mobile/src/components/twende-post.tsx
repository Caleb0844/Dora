import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PostActions } from '@/components/post-actions';
import { theme } from '@/theme';

type TwendePostProps = {
  id: string;
  name: string;
  category: string;
  county: string;
  distanceKm?: number | null;
  thumbnailUrl?: string | null;
  creatorUsername?: string;
  creatorDisplayName?: string | null;
  creatorProfileImage?: string | null;
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
  thumbnailUrl,
  creatorUsername,
  creatorDisplayName,
  creatorProfileImage,
  visited = false,
  visiting = false,
  bookmarked = false,
  onVisitedPress,
  onBookmarkPress,
}: TwendePostProps) {
  return (
    <View style={styles.post}>
      <Pressable
        style={styles.postHeader}
        onPress={() => {
          if (!creatorUsername) {
            return;
          }

          router.push({
            pathname: '/user/[username]',
            params: { username: creatorUsername },
          });
        }}
      >
        {creatorProfileImage ? (
          <Image
            source={{ uri: creatorProfileImage }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {creatorDisplayName?.charAt(0)?.toUpperCase() ??
                creatorUsername?.charAt(0)?.toUpperCase() ??
                'T'}
            </Text>
          </View>
        )}

        <View style={styles.creatorInfo}>
          <Text style={styles.creator}>
            {creatorDisplayName ?? creatorUsername ?? 'Twende Explorer'}
          </Text>

          <Text style={styles.username}>
            {creatorUsername ? `@${creatorUsername}` : ''}
          </Text>

          <Text style={styles.location}>
            {county}
            {distanceKm != null
              ? ` · ${distanceKm.toFixed(1)} km`
              : ''}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/place/[id]',
            params: { id },
          })
        }
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}
      </Pressable>

      <PostActions
        visited={visited}
        visiting={visiting}
        bookmarked={bookmarked}
        onVisitedPress={() => onVisitedPress?.(id)}
        onBookmarkPress={() => onBookmarkPress?.(id)}
      />

      <Pressable
        style={styles.details}
        onPress={() =>
          router.push({
            pathname: '/place/[id]',
            params: { id },
          })
        }
      >
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.category}>{category}</Text>
      </Pressable>
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
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: theme.colors.border,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  avatarLetter: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  creatorInfo: {
    flex: 1,
  },
  creator: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  username: {
    marginTop: 1,
    fontSize: 12,
    color: theme.colors.green,
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
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: theme.colors.textSecondary,
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
