import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/theme';

export type ProfileGridPlace = {
  id: string;
  name: string;
  image?: string | null;
};

type Props = {
  places: ProfileGridPlace[];
  actionLabel?: string;
  secondaryActionLabel?: string;
  publicProfileLayout?: boolean;
  ownProfileLayout?: boolean;
  showMore?: boolean;
  loadingMore?: boolean;
  onMore?: () => void;
  onPressPlace?: (place: ProfileGridPlace) => void;
  onPrimaryAction?: (place: ProfileGridPlace) => void;
  onSecondaryAction?: (place: ProfileGridPlace) => void;
};

export function ProfilePlaceGrid({
  places,
  actionLabel,
  secondaryActionLabel,
  publicProfileLayout = false,
  ownProfileLayout = false,
  showMore = false,
  loadingMore = false,
  onMore,
  onPressPlace,
  onPrimaryAction,
  onSecondaryAction,
}: Props) {
  return (
    <View
      style={[
        styles.grid,
        publicProfileLayout && styles.publicGrid,
        ownProfileLayout && styles.ownGrid,
      ]}
    >
      {places.map((place, index) => (
        <View
          key={place.id}
          style={[
            styles.card,
            publicProfileLayout && styles.publicCard,
            publicProfileLayout &&
              index % 2 === 0 &&
              styles.publicCardLeft,
            ownProfileLayout && styles.ownCard,
            ownProfileLayout &&
              index % 3 !== 2 &&
              styles.ownCardDivider,
          ]}
        >
          <Pressable onPress={() => onPressPlace?.(place)}>
            {place.image ? (
              <Image
                source={{ uri: place.image }}
                style={[
                  styles.image,
                  publicProfileLayout && styles.publicImage,
                  ownProfileLayout && styles.ownImage,
                ]}
              />
            ) : (
              <View
                style={[
                  styles.imagePlaceholder,
                  publicProfileLayout &&
                    styles.publicImagePlaceholder,
                  ownProfileLayout &&
                    styles.ownImagePlaceholder,
                ]}
              >
                {ownProfileLayout && (
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                )}
              </View>
            )}

            <Text
              numberOfLines={1}
              style={[
                styles.name,
                publicProfileLayout && styles.publicName,
                ownProfileLayout && styles.ownName,
              ]}
            >
              {place.name}
            </Text>
          </Pressable>

          {(actionLabel || secondaryActionLabel) && (
            <View
              style={[
                styles.actions,
                ownProfileLayout && styles.ownActions,
              ]}
            >
              {actionLabel && (
                <Pressable
                  style={[
                    styles.actionButton,
                    ownProfileLayout &&
                      styles.ownActionButton,
                  ]}
                  onPress={() => onPrimaryAction?.(place)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      ownProfileLayout &&
                        styles.ownActionText,
                    ]}
                  >
                    {actionLabel}
                  </Text>
                </Pressable>
              )}

              {secondaryActionLabel && (
                <Pressable
                  style={[
                    styles.actionButton,
                    ownProfileLayout &&
                      styles.ownActionButton,
                  ]}
                  onPress={() => onSecondaryAction?.(place)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      ownProfileLayout &&
                        styles.ownActionText,
                    ]}
                  >
                    {secondaryActionLabel}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ))}

      {ownProfileLayout && showMore && (
        <View
          style={[
            styles.ownCard,
            places.length % 3 !== 2 &&
              styles.ownCardDivider,
          ]}
        >
          <Pressable
            style={styles.moreTile}
            onPress={onMore}
            disabled={loadingMore}
            accessibilityRole="button"
            accessibilityLabel="Load more places"
          >
            {loadingMore ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.text}
              />
            ) : (
              <>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={25}
                  color={theme.colors.text}
                />
                <Text style={styles.moreText}>More</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  actions: {
    marginTop: 7,
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },

  // Public profile stays exactly two-column.
  publicGrid: {
    justifyContent: 'flex-start',
    columnGap: 0,
    rowGap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  publicCard: {
    width: '50%',
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  publicCardLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border,
  },
  publicImage: {
    borderRadius: 0,
  },
  publicImagePlaceholder: {
    borderRadius: 0,
  },
  publicName: {
    marginTop: 5,
    paddingHorizontal: 5,
    paddingBottom: 2,
  },

  // Signed-in user's profile: three columns, edge-to-edge.
  ownGrid: {
    justifyContent: 'flex-start',
    columnGap: 0,
    rowGap: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  ownCard: {
    width: '33.333333%',
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  ownCardDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border,
  },
  ownImage: {
    borderRadius: 0,
  },
  ownImagePlaceholder: {
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownName: {
    marginTop: 5,
    paddingHorizontal: 5,
    fontSize: 11,
    paddingBottom: 2,
  },
  ownActions: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingBottom: 3,
    gap: 4,
  },
  ownActionButton: {
    paddingVertical: 5,
    borderRadius: 3,
  },
  ownActionText: {
    fontSize: 10,
  },

  // This is intentionally a muted preview/continuation tile.
  moreTile: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSoft,
    opacity: 0.72,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
