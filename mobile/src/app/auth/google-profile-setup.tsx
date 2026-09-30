import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { completeGoogleProfile } from '@/features/auth/auth-service';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { theme } from '@/theme';

export default function GoogleProfileSetupScreen() {
  const { setupToken, email } = useLocalSearchParams<{
    setupToken?: string;
    email?: string;
  }>();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!setupToken) {
      Alert.alert(
        'Google sign-in failed',
        'The Google profile setup token is missing.'
      );
      return;
    }

    try {
      setLoading(true);

      await completeGoogleProfile({
        setupToken,
        displayName,
        username,
        profileImage: null,
      });

      resumeAfterAuth();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        'Could not finish Google sign-in.';

      const errors = error?.response?.data?.errors;

      if (errors && Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];

        Alert.alert(
          'Google sign-in failed',
          String(firstError ?? message)
        );

        return;
      }

      Alert.alert('Google sign-in failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finish your profile</Text>

      {!!email && (
        <Text style={styles.email}>{email}</Text>
      )}

      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Finishing...' : 'Continue'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  email: {
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
