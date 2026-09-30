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
import { theme } from '@/theme';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    profile_setup_required?: string;
    setup_token?: string;
    email?: string;
  }>();

  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    async function handleCallback() {
      try {
        if (params.code) {
          await exchangeGoogleCode(params.code);
          router.replace('/');
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

        Alert.alert(
          'Google sign-in failed',
          'The Google callback did not contain the expected information.',
          [
            {
              text: 'Back to sign in',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ??
          'Could not complete Google sign-in.';

        setMessage(errorMessage);

        Alert.alert(
          'Google sign-in failed',
          errorMessage,
          [
            {
              text: 'Back to sign in',
              onPress: () => router.replace('/login'),
            },
          ]
        );
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

      <Text style={styles.title}>Google Sign-In</Text>

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
