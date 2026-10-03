import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthLoadingModal } from '@/components/auth-loading-modal';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { useAuthIntentStore } from '@/store/auth-intent';

import {
  login,
  startGoogleLogin,
} from '@/features/auth/auth-service';
import { getAppError } from '@/services/api/error-utils';
import { theme } from '@/theme';

export default function LoginScreen() {
  const { fromAuthPrompt } = useLocalSearchParams<{
    fromAuthPrompt?: string;
  }>();

  const clearIntent = useAuthIntentStore((state) => state.clearIntent);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      await login({
        identifier,
        password,
      });

      await resumeAfterAuth();
    } catch (error) {
      const appError = getAppError(
        error,
        'Wrong username or password.'
      );

      const shouldReturnHome =
        appError.kind === 'network' ||
        appError.kind === 'timeout' ||
        appError.kind === 'server';

      Alert.alert(
        'Sign in failed',
        shouldReturnHome
          ? appError.message
          : 'Wrong username or password.'
      );

      if (shouldReturnHome) {
        clearIntent();
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setGoogleLoading(true);

      const result = await startGoogleLogin();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success') {
        Alert.alert(
          'Google sign-in failed',
          'Google sign-in could not be completed.'
        );
      }
    } catch (error) {
      const appError = getAppError(
        error,
        'Could not start Google sign-in.'
      );

      Alert.alert(
        'Google sign-in failed',
        appError.message
      );

      if (
        appError.kind === 'network' ||
        appError.kind === 'timeout' ||
        appError.kind === 'server'
      ) {
        clearIntent();
        router.replace('/');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {fromAuthPrompt !== 'true' ? (
        <Pressable
          style={styles.closeButton}
          onPress={() => {
            clearIntent();

            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
        >
          <Ionicons
            name="close"
            size={30}
            color={theme.colors.text}
          />
        </Pressable>
      ) : null}

      <Text style={styles.title}>Sign in</Text>

      <TextInput
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Email or username"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        maxLength={254}
        style={styles.input}
      />

      <View style={styles.passwordField}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          maxLength={72}
          style={styles.passwordInput}
        />

        <Pressable
          style={styles.passwordEye}
          onPress={() => setShowPassword((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword ? 'Hide password' : 'Show password'
          }
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={21}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <Pressable
        style={styles.button}
        onPress={handleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          Continue with Google
        </Text>
      </Pressable>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>
          Don&apos;t have an account?
        </Text>

        <Pressable onPress={() => router.replace('/signup')}>
          <Text style={styles.signupLink}>Create account</Text>
        </Pressable>
      </View>

      <AuthLoadingModal
        visible={loading || googleLoading}
        label="Signing in"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 22,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  passwordField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    color: theme.colors.text,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 14,
  },
  passwordEye: {
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  orText: {
    marginVertical: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  googleButton: {
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  googleButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
  signupRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  signupText: {
    color: theme.colors.textSecondary,
  },
  signupLink: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
