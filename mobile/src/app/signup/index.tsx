import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import {
  register,
  startGoogleLogin,
} from '@/features/auth/auth-service';
import {
  deleteCloudinaryUploadByToken,
  uploadImageToCloudinary,
} from '@/services/api/cloudinary-service';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { theme } from '@/theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handlePickProfileImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Photo permission required',
        'Twende needs access to your photos to choose a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  }

  async function handleSignup() {
    let uploadedDeleteToken: string | null = null;

    try {
      setLoading(true);

      let profileImageUrl: string | null = null;

      if (profileImage) {
        const upload = await uploadImageToCloudinary(profileImage);
        profileImageUrl = upload.url;
        uploadedDeleteToken = upload.deleteToken;
      }

      await register({
        email,
        username,
        displayName,
        password,
        confirmPassword,
        profileImageUrl,
      });

      uploadedDeleteToken = null;

      await resumeAfterAuth();
    } catch (error: any) {
      if (uploadedDeleteToken) {
        try {
          await deleteCloudinaryUploadByToken(uploadedDeleteToken);
        } catch (cleanupError) {
          console.log(
            'Failed to clean up signup profile image:',
            cleanupError
          );
        }
      }

      const message =
        error?.response?.data?.message ??
        'Could not create your account.';

      const errors = error?.response?.data?.errors;

      if (errors && Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];

        Alert.alert(
          'Sign up failed',
          String(firstError ?? message)
        );

        return;
      }

      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      setGoogleLoading(true);

      const result = await startGoogleLogin();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success') {
        Alert.alert(
          'Google sign-up failed',
          'Google sign-up could not be completed.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Google sign-up failed',
        error?.message ?? 'Could not start Google sign-up.'
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create account</Text>

      <View style={styles.profilePhotoSection}>
        <Pressable
          style={styles.profilePhotoButton}
          onPress={handlePickProfileImage}
          disabled={loading || googleLoading}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profilePhoto}
              contentFit="cover"
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profilePhotoPlaceholderText}>
                Add photo
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={handlePickProfileImage}
          disabled={loading || googleLoading}
        >
          <Text style={styles.profilePhotoAction}>
            {profileImage
              ? 'Change profile photo'
              : 'Add profile photo (optional)'}
          </Text>
        </Pressable>

        {profileImage ? (
          <Pressable
            onPress={() => setProfileImage(null)}
            disabled={loading || googleLoading}
          >
            <Text style={styles.removeProfilePhoto}>
              Remove photo
            </Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
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

      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        placeholderTextColor={theme.colors.textSecondary}
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

      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor={theme.colors.textSecondary}
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={handleSignup}
        disabled={loading || googleLoading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating account...' : 'Create account'}
        </Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleSignup}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          {googleLoading
            ? 'Opening Google...'
            : 'Continue with Google'}
        </Text>
      </Pressable>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>
          Already have an account?
        </Text>

        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.loginLink}>Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhotoButton: {
    marginBottom: 10,
  },
  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  profilePhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  profilePhotoAction: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  removeProfilePhoto: {
    marginTop: 8,
    color: theme.colors.textSecondary,
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
  loginRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  loginText: {
    color: theme.colors.textSecondary,
  },
  loginLink: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
