import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/theme';

type PlaceMetaSwitchProps = {
  county: string;
  category: string;
  distanceKm?: number | null;
};

export function PlaceMetaSwitch({
  county,
  category,
  distanceKm,
}: PlaceMetaSwitchProps) {
  const [showCategory, setShowCategory] = useState(false);
  const [motion] = useState(() => new Animated.Value(0));

  const toggleValue = useCallback(() => {
    setShowCategory((current) => !current);
  }, []);

  useEffect(() => {
    if (!county || !category || county === category) {
      return;
    }

    const timer = setInterval(() => {
      Animated.timing(motion, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        toggleValue();

        motion.setValue(-1);

        Animated.timing(motion, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);

    return () => {
      clearInterval(timer);
      motion.stopAnimation();
    };
  }, [category, county, motion, toggleValue]);

  const value =
    showCategory && category
      ? category
      : county || category;

  const animatedStyle = {
    opacity: motion.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateY: motion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [7, 0, -7],
        }),
      },
      {
        translateX: motion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-3, 0, 9],
        }),
      },
    ],
  };

  return (
    <View style={styles.row}>
      <Animated.View style={animatedStyle}>
        <Text
          style={styles.text}
          numberOfLines={1}
        >
          {value}
        </Text>
      </Animated.View>

      {distanceKm != null ? (
        <Text style={styles.distance}>
          · {distanceKm.toFixed(1)} km
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginLeft: 7,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 18,
  },
  text: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  distance: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
