import { Ionicons } from '@expo/vector-icons';
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

import { AuthLoadingModal } from '@/components/auth-loading-modal';
import {
  register,
  startGoogleLogin,
} from '@/features/auth/auth-service';
import {
  deleteCloudinaryUploadByToken,
  uploadImageToCloudinary,
} from '@/services/api/cloudinary-service';
import { getAppError } from '@/services/api/error-utils';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import { useAuthIntentStore } from '@/store/auth-intent';
import { theme } from '@/theme';

export default function SignupScreen() {
  const clearIntent = useAuthIntentStore((state) => state.clearIntent);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordHasLength = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);
  const passwordHasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

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
    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (!/\d/.test(password)) {
      Alert.alert(
        'Password needs a number',
        'Add at least one number to your password.'
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      Alert.alert(
        'Password needs a special character',
        'Add at least one special character such as @, !, #, $, %, & or *.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Password and confirm password must match.'
      );
      return;
    }

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

      const appError = getAppError(
        error,
        'Could not create your account.'
      );

      const shouldReturnHome =
        appError.kind === 'network' ||
        appError.kind === 'timeout' ||
        appError.kind === 'server';

      Alert.alert(
        'Sign up failed',
        appError.message
      );

      if (shouldReturnHome) {
        clearIntent();
        router.replace('/');
      }
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
    } catch (error) {
      const appError = getAppError(
        error,
        'Could not start Google sign-up.'
      );

      Alert.alert(
        'Google sign-up failed',
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
        maxLength={254}
        style={styles.input}
      />

      <View style={styles.usernameField}>
        <Text style={styles.usernamePrefix}>@</Text>

        <TextInput
          value={username}
          onChangeText={(value) =>
            setUsername(value.replace(/^@+/, ''))
          }
          placeholder="username"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          style={styles.usernameInput}
        />
      </View>

      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        placeholderTextColor={theme.colors.textSecondary}
        maxLength={80}
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

      <View style={styles.passwordField}>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          maxLength={72}
          style={styles.passwordInput}
        />

        <Pressable
          style={styles.passwordEye}
          onPress={() =>
            setShowConfirmPassword((current) => !current)
          }
          accessibilityRole="button"
          accessibilityLabel={
            showConfirmPassword
              ? 'Hide confirm password'
              : 'Show confirm password'
          }
        >
          <Ionicons
            name={
              showConfirmPassword
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={21}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.passwordChecklist}>
        <View style={styles.passwordCheckRow}>
          <Ionicons
            name={
              passwordHasLength
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={17}
            color={
              passwordHasLength
                ? theme.colors.green
                : theme.colors.textSecondary
            }
          />
          <Text style={styles.passwordCheckText}>
            At least 8 characters
          </Text>
        </View>

        <View style={styles.passwordCheckRow}>
          <Ionicons
            name={
              passwordHasNumber
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={17}
            color={
              passwordHasNumber
                ? theme.colors.green
                : theme.colors.textSecondary
            }
          />
          <Text style={styles.passwordCheckText}>
            At least one number
          </Text>
        </View>

        <View style={styles.passwordCheckRow}>
          <Ionicons
            name={
              passwordHasSpecial
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={17}
            color={
              passwordHasSpecial
                ? theme.colors.green
                : theme.colors.textSecondary
            }
          />
          <Text style={styles.passwordCheckText}>
            At least one special character
          </Text>
        </View>

        <View style={styles.passwordCheckRow}>
          <Ionicons
            name={
              passwordsMatch
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={17}
            color={
              passwordsMatch
                ? theme.colors.green
                : theme.colors.textSecondary
            }
          />
          <Text style={styles.passwordCheckText}>
            Passwords match
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.button}
        onPress={handleSignup}
        disabled={loading || googleLoading}
      >
        <Text style={styles.buttonText}>Create account</Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleSignup}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          Continue with Google
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

      <AuthLoadingModal
        visible={loading || googleLoading}
        label="Signing up"
      />
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhotoButton: {
    marginBottom: 10,
  },
  profilePhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  profilePhotoPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  usernameField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  usernamePrefix: {
    paddingLeft: 14,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  usernameInput: {
    flex: 1,
    color: theme.colors.text,
    paddingLeft: 3,
    paddingRight: 14,
    paddingVertical: 14,
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
  passwordChecklist: {
    gap: 7,
    marginTop: -2,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  passwordCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordCheckText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
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
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#000000',
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
