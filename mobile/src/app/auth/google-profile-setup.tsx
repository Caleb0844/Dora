import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { completeGoogleProfile } from '@/features/auth/auth-service';
import { resumeAfterAuth } from '@/features/auth/resume-after-auth';
import {
  deleteCloudinaryUploadByToken,
  uploadImageToCloudinary,
} from '@/services/api/cloudinary-service';
import { theme } from '@/theme';

export default function GoogleProfileSetupScreen() {
  const { setupToken, email } = useLocalSearchParams<{
    setupToken?: string;
    email?: string;
  }>();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function handleContinue() {
    if (!setupToken) {
      Alert.alert(
        'Google sign-in failed',
        'The Google profile setup token is missing.'
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

      await completeGoogleProfile({
        setupToken,
        displayName,
        username,
        profileImage: profileImageUrl,
      });

      uploadedDeleteToken = null;

      await resumeAfterAuth();
    } catch (error: any) {
      if (uploadedDeleteToken) {
        try {
          await deleteCloudinaryUploadByToken(uploadedDeleteToken);
        } catch (cleanupError) {
          console.log(
            'Failed to clean up Google profile image:',
            cleanupError
          );
        }
      }

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

      <View style={styles.profilePhotoSection}>
        <Pressable
          style={styles.profilePhotoButton}
          onPress={handlePickProfileImage}
          disabled={loading}
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
          disabled={loading}
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
            disabled={loading}
          >
            <Text style={styles.removeProfilePhoto}>
              Remove photo
            </Text>
          </Pressable>
        ) : null}
      </View>

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
    fontSize: 16,
    fontWeight: '800',
  },
});
