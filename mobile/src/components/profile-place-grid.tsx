import {
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
  onPressPlace?: (place: ProfileGridPlace) => void;
  onPrimaryAction?: (place: ProfileGridPlace) => void;
  onSecondaryAction?: (place: ProfileGridPlace) => void;
};

export function ProfilePlaceGrid({
  places,
  actionLabel,
  secondaryActionLabel,
  publicProfileLayout = false,
  onPressPlace,
  onPrimaryAction,
  onSecondaryAction,
}: Props) {
  return (
    <View
      style={[
        styles.grid,
        publicProfileLayout && styles.publicGrid,
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
          ]}
        >
          <Pressable onPress={() => onPressPlace?.(place)}>
            {place.image ? (
              <Image
                source={{ uri: place.image }}
                style={[
                  styles.image,
                  publicProfileLayout && styles.publicImage,
                ]}
              />
            ) : (
              <View
                style={[
                  styles.imagePlaceholder,
                  publicProfileLayout &&
                    styles.publicImagePlaceholder,
                ]}
              />
            )}

            <Text
              numberOfLines={1}
              style={[
                styles.name,
                publicProfileLayout && styles.publicName,
              ]}
            >
              {place.name}
            </Text>
          </Pressable>

          {(actionLabel || secondaryActionLabel) && (
            <View style={styles.actions}>
              {actionLabel && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onPrimaryAction?.(place)}
                >
                  <Text style={styles.actionText}>{actionLabel}</Text>
                </Pressable>
              )}

              {secondaryActionLabel && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onSecondaryAction?.(place)}
                >
                  <Text style={styles.actionText}>
                    {secondaryActionLabel}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ))}
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
});
