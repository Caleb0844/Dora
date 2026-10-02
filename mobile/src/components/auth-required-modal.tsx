import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthIntentStore } from '@/store/auth-intent';
import { useAuthPromptStore } from '@/store/auth-prompt';
import { theme } from '@/theme';

const messages = {
  add: {
    title: 'Sign in to add a place',
    text: 'Create an account or sign in to share places with the Twende community.',
  },
  profile: {
    title: 'Sign in to view your profile',
    text: 'You need a Twende account to access your profile.',
  },
  bookmark: {
    title: 'Sign in to save places',
    text: 'Create an account or sign in to keep places you want to visit.',
  },
  explore: {
    title: 'Sign in to mark places',
    text: 'Create an account or sign in to keep track of places you have explored.',
  },
} as const;

export function AuthRequiredModal() {
  const isOpen = useAuthPromptStore((state) => state.isOpen);
  const reason = useAuthPromptStore((state) => state.reason);
  const closePrompt = useAuthPromptStore((state) => state.closePrompt);

  const clearIntent = useAuthIntentStore((state) => state.clearIntent);

  const content = reason ? messages[reason] : null;

  function handleCancel() {
    clearIntent();
    closePrompt();
  }

  function handleAuthenticate() {
    // Add/Profile authentication should return to Home after success.
    // Only bookmark/explore intents should resume their original action.
    if (reason === 'add' || reason === 'profile') {
      clearIntent();
    }

    closePrompt();

    router.push({
      pathname: '/login',
      params: {
        fromAuthPrompt: 'true',
      },
    });
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons
              name="person-outline"
              size={28}
              color={theme.colors.accent}
            />
          </View>

          <Text style={styles.title}>
            {content?.title ?? 'Sign in required'}
          </Text>

          <Text style={styles.text}>
            {content?.text ??
              'You need an account to continue.'}
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={handleAuthenticate}
          >
            <Text style={styles.primaryButtonText}>
              Sign in / Sign up
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 24,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
});
