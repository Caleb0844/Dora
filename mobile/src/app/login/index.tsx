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
import { router } from 'expo-router';

import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { useAuthIntentStore } from '@/store/auth-intent';

import {
  login,
  startGoogleLogin,
} from '@/features/auth/auth-service';
import { theme } from '@/theme';

export default function LoginScreen() {
  const clearIntent = useAuthIntentStore((state) => state.clearIntent);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      await login({
        identifier,
        password,
      });

      resumeAfterAuth();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        'Could not sign in.';

      Alert.alert('Login failed', message);
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
    } catch (error: any) {
      Alert.alert(
        'Google sign-in failed',
        error?.message ?? 'Could not start Google sign-in.'
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.closeButton}
        onPress={() => {
          clearIntent();
          router.replace('/');
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

      <Text style={styles.title}>Sign in</Text>

      <TextInput
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Email or username"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.colors.textSecondary}
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={handleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          {googleLoading
            ? 'Opening Google...'
            : 'Continue with Google'}
        </Text>
      </Pressable>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>
          Don't have an account?
        </Text>

        <Pressable onPress={() => router.replace('/signup')}>
          <Text style={styles.signupLink}>Create account</Text>
        </Pressable>
      </View>
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
    fontSize: 28,
    fontWeight: '800',
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
    fontWeight: '800',
    fontSize: 16,
  },
  orText: {
    marginVertical: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  googleButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    color: theme.colors.text,
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
