import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlaceMetaSwitch } from '@/components/place-meta-switch';
import { theme } from '@/theme';

type TwendePostProps = {
  id: string;
  name: string;
  category: string;
  county: string;
  description?: string | null;
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
  description,
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

          <View style={styles.usernameMetaRow}>
            <Text style={styles.username}>
              {creatorUsername ? `@${creatorUsername}` : ''}
            </Text>

            <PlaceMetaSwitch
              county={county}
              category={category}
              distanceKm={distanceKm}
            />
          </View>
        </View>
      </Pressable>

      <View style={styles.imageWrapper}>
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

        <View style={styles.imageActions}>
          <Pressable
            style={styles.imageBookmark}
            onPress={() => onBookmarkPress?.(id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              bookmarked
                ? 'Remove saved place'
                : 'Save place'
            }
          >
            <Ionicons
              name={
                bookmarked
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={23}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.placeName}>{name}</Text>

        {!!description && (
          <Text
            style={styles.description}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {description}
          </Text>
        )}

        <Pressable
          style={styles.viewMoreButton}
          onPress={() =>
            router.push({
              pathname: '/place/[id]',
              params: { id },
            })
          }
        >
          <Text style={styles.viewMoreText}>
            View more
          </Text>
        </Pressable>
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
  usernameMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.border,
  },
  imageActions: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  imageBookmark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
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
  description: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  viewMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 7,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
