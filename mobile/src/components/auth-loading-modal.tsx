import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/theme';

type AuthLoadingModalProps = {
  visible: boolean;
  label: string;
};

export function AuthLoadingModal({
  visible,
  label,
}: AuthLoadingModalProps) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!visible) {
      setDotCount(1);
      return;
    }

    const interval = setInterval(() => {
      setDotCount((current) =>
        current >= 3 ? 1 : current + 1
      );
    }, 320);

    return () => {
      clearInterval(interval);
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.popup}>
          <ActivityIndicator
            size="small"
            color={theme.colors.accent}
          />

          <View style={styles.copy}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.dots}>
              {'.'.repeat(dotCount)}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  popup: {
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  copy: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dots: {
    width: 24,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
