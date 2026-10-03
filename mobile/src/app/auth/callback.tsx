import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { exchangeGoogleCode } from '@/features/auth/auth-service';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { useAuthIntentStore } from '@/store/auth-intent';
import { theme } from '@/theme';

export default function AuthCallbackScreen() {
  const clearIntent = useAuthIntentStore((state) => state.clearIntent);

  const params = useLocalSearchParams<{
    code?: string;
    profile_setup_required?: string;
    setup_token?: string;
    email?: string;
  }>();

  const [message, setMessage] = useState('Redirecting you to homepage...');

  useEffect(() => {
    async function handleCallback() {
      try {
        if (params.code) {
          await exchangeGoogleCode(params.code);
          await resumeAfterAuth();
          return;
        }

        if (
          params.profile_setup_required === 'true' &&
          params.setup_token
        ) {
          router.replace({
            pathname: '/auth/google-profile-setup',
            params: {
              setupToken: params.setup_token,
              email: params.email ?? '',
            },
          });
          return;
        }

        setMessage('Google sign-in could not be completed.');

        clearIntent();

        Alert.alert(
          'Google sign-in failed',
          'The Google callback did not contain the expected information.'
        );

        router.replace('/');
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ??
          'Could not complete Google sign-in.';

        setMessage(errorMessage);

        clearIntent();

        Alert.alert(
          'Google sign-in failed',
          errorMessage
        );

        router.replace('/');
      }
    }

    void handleCallback();
  }, [
    params.code,
    params.email,
    params.profile_setup_required,
    params.setup_token,
  ]);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={theme.colors.accent}
      />

      <Text style={styles.title}>Redirecting you to homepage</Text>

      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  title: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  text: {
    marginTop: 10,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
});
