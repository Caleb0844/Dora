import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getAppError } from '@/services/api/error-utils';
import { theme } from '@/theme';

type RequestErrorStateProps = {
  error: unknown;
  title?: string;
  fallbackMessage?: string;
  retryLabel?: string;
  onRetry: () => void;
};

export function RequestErrorState({
  error,
  title = 'Could not load this page',
  fallbackMessage,
  retryLabel = 'Retry',
  onRetry,
}: RequestErrorStateProps) {
  const appError = getAppError(error, fallbackMessage);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.message}>
        {appError.message}
      </Text>

      <Pressable
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
      >
        <Text style={styles.retryText}>
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
    textAlign: 'center',
  },
  retryButton: {
    borderColor: theme.colors.text,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
