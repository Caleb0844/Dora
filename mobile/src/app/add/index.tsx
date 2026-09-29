import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomNav } from '@/components/bottom-nav';
import {
  Category,
  County,
  getCategories,
  getCounties,
} from '@/services/api/catalog-service';
import {
  deleteCloudinaryUploadByToken,
  uploadImageToCloudinary,
} from '@/services/api/cloudinary-service';
import { createPlace, getPlace, updatePlace } from '@/services/api/place-service';
import { theme } from '@/theme';

export default function AddPlaceScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEditing = Boolean(edit);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [showCategories, setShowCategories] = useState(false);
  const [showCounties, setShowCounties] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => console.log('Failed to load categories:', error));

    getCounties()
      .then(setCounties)
      .catch((error) => console.log('Failed to load counties:', error));
  }, []);


  useEffect(() => {
    if (!edit || categories.length === 0 || counties.length === 0) {
      return;
    }

    const placeId = edit;

    async function loadPlaceForEdit() {
      try {
        const place = await getPlace(placeId);

        setName(place.name ?? '');
        setDescription(place.description ?? '');
        setLatitude(place.latitude ?? null);
        setLongitude(place.longitude ?? null);
        setImages(place.images ?? []);

        setSelectedCategory(
          categories.find(
            (category) =>
              category.slug === place.category ||
              category.name.toLowerCase() ===
                String(place.category).toLowerCase()
          ) ?? null
        );

        setSelectedCounty(
          counties.find(
            (county) =>
              county.code === place.county ||
              county.name.toLowerCase() ===
                String(place.county).toLowerCase()
          ) ?? null
        );
      } catch (error: any) {
        Alert.alert(
          'Could not load place',
          error?.response?.data?.message ??
            'Could not load this place for editing.'
        );
      }
    }

    loadPlaceForEdit();
  }, [edit, categories, counties]);


  async function handlePickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Photo permission required',
        'Twende needs access to your photos to add place images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled) {
      const selected = result.assets.map((asset) => asset.uri);
      setImages((current) => [...current, ...selected].slice(0, 10));
    }
  }

  async function handleTakePhoto() {
    if (images.length >= 10) {
      Alert.alert(
        'Image limit reached',
        'You can add up to 10 images.'
      );
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Camera permission required',
        'Twende needs camera access to take place photos.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const photoUri = result.assets[0].uri;

      setImages((current) =>
        [...current, photoUri].slice(0, 10)
      );
    }
  }



  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Missing place name', 'Enter a place name.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Missing category', 'Select a category.');
      return;
    }

    if (!selectedCounty) {
      Alert.alert('Missing county', 'Select a county.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing description', 'Enter a description.');
      return;
    }

    if (images.length < 2) {
      Alert.alert('More images required', 'Select at least 2 images.');
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert('Location required', 'Set the place location.');
      return;
    }

    const uploadedDeleteTokens: string[] = [];

    try {
      setSubmitting(true);

      const uploadedUrls: string[] = [];

      for (const uri of images) {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          uploadedUrls.push(uri);
        } else {
          const upload = await uploadImageToCloudinary(uri);

          uploadedUrls.push(upload.url);

          if (upload.deleteToken) {
            uploadedDeleteTokens.push(upload.deleteToken);
          }
        }
      }

      const payload = {
        name: name.trim(),
        category: selectedCategory.slug,
        countyCode: selectedCounty.code,
        description: description.trim(),
        latitude,
        longitude,
        images: uploadedUrls,
      };

      if (isEditing && edit) {
        await updatePlace(edit, payload);

        Alert.alert(
          'Place updated',
          'Your changes were saved successfully.'
        );
      } else {
        await createPlace(payload);

        Alert.alert(
          'Place added',
          'Your place was added successfully.'
        );

        setName('');
        setDescription('');
        setSelectedCategory(null);
        setSelectedCounty(null);
        setImages([]);
        setLatitude(null);
        setLongitude(null);
      }
    } catch (error: any) {
      if (uploadedDeleteTokens.length > 0) {
        await Promise.allSettled(
          uploadedDeleteTokens.map((deleteToken) =>
            deleteCloudinaryUploadByToken(deleteToken)
          )
        );
      }

      Alert.alert(
        isEditing ? 'Could not update place' : 'Could not add place',
        error?.response?.data?.message ??
          error?.message ??
          'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCurrentLocation() {
    try {
      setGettingLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Twende needs location permission to add this place.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(Number(location.coords.latitude.toFixed(6)));
      setLongitude(Number(location.coords.longitude.toFixed(6)));
    } catch {
      Alert.alert('Location error', 'Could not get your current location.');
    } finally {
      setGettingLocation(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Add a Place</Text>
        <Text style={styles.subtitle}>
          Share a hidden gem and earn XP.
        </Text>

        <Text style={styles.label}>PLACE NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sheldrick Falls"
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>CATEGORY</Text>

        <Pressable
          style={styles.select}
          onPress={() => setShowCategories((value) => !value)}
        >
          <Text style={styles.selectText}>
            {selectedCategory?.name ?? 'Select a category'}
          </Text>

          <Ionicons
            name={showCategories ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.text}
          />
        </Pressable>

        {showCategories && (
          <View style={styles.dropdown}>
            {categories.map((category) => (
              <Pressable
                key={category.slug}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategories(false);
                }}
              >
                <Text style={styles.dropdownText}>{category.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>COUNTY</Text>

        <Pressable
          style={styles.select}
          onPress={() => setShowCounties((value) => !value)}
        >
          <Text style={styles.selectText}>
            {selectedCounty?.name ?? 'Select a county'}
          </Text>

          <Ionicons
            name={showCounties ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.text}
          />
        </Pressable>

        {showCounties && (
          <View style={styles.dropdown}>
            {counties.map((county) => (
              <Pressable
                key={county.code}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCounty(county);
                  setShowCounties(false);
                }}
              >
                <Text style={styles.dropdownText}>{county.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={styles.description}
          placeholder="What makes this place special?"
          placeholderTextColor={theme.colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>
          IMAGES ({images.length}/10 · MIN 2)
        </Text>

        <View style={styles.imageRow}>
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imagePreviewWrap}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <Pressable
                style={styles.removeImage}
                onPress={() =>
                  setImages((current) =>
                    current.filter((_, imageIndex) => imageIndex !== index)
                  )
                }
              >
                <Ionicons name="close" size={16} color={theme.colors.white} />
              </Pressable>
            </View>
          ))}

          {images.length < 10 && (
            <>
              <Pressable
                style={styles.imageBox}
                onPress={handlePickImages}
              >
                <Ionicons
                  name="images-outline"
                  size={32}
                  color={theme.colors.muted}
                />
                <Text style={styles.imageAdd}>Gallery</Text>
              </Pressable>

              <Pressable
                style={styles.imageBox}
                onPress={handleTakePhoto}
              >
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={theme.colors.muted}
                />
                <Text style={styles.imageAdd}>Camera</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.helper}>
          {images.length >= 2
            ? `${images.length} image(s) selected`
            : `Add at least ${2 - images.length} more image(s)`}
        </Text>

        <Text style={styles.label}>LOCATION</Text>

        <View style={styles.locationMode}>
          <Pressable style={[styles.locationOption, styles.locationActive]}>
            <Ionicons
              name="location-outline"
              size={25}
              color={theme.colors.white}
            />
            <Text style={styles.locationActiveText}>Current</Text>
          </Pressable>

          <Pressable style={styles.locationOption}>
            <Ionicons
              name="pin-outline"
              size={24}
              color={theme.colors.muted}
            />
            <Text style={styles.locationInactiveText}>Drop Pin</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.updateLocation}
          onPress={handleCurrentLocation}
          disabled={gettingLocation}
        >
          <Ionicons
            name="location-outline"
            size={26}
            color={theme.colors.white}
          />
          <Text style={styles.updateLocationText}>
            {gettingLocation ? 'Getting location...' : 'Update current location'}
          </Text>
        </Pressable>

        <Text style={styles.coordinates}>
          {latitude !== null && longitude !== null
            ? `${latitude}, ${longitude}`
            : 'Location not selected'}
        </Text>

        <Text style={styles.stillNeeded}>
          Still needed: Place name, Category, County, Description, 2 more image(s)
        </Text>

        <Pressable
          style={styles.submit}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting
              ? isEditing
                ? 'Saving changes...'
                : 'Adding place...'
              : isEditing
                ? 'Save Changes'
                : 'Add Place · +10 XP'}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 45,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 30,
    fontSize: 17,
    color: theme.colors.textSecondary,
  },
  label: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
  },
  input: {
    height: 60,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    fontSize: 17,
    color: theme.colors.text,
  },
  select: {
    height: 60,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 17,
    color: theme.colors.text,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSoft,
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  description: {
    height: 140,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    fontSize: 17,
    color: theme.colors.text,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imagePreviewWrap: {
    position: 'relative',
  },
  imagePreview: {
    width: 125,
    height: 125,
    borderRadius: 16,
  },
  removeImage: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBox: {
    width: 125,
    height: 125,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAdd: {
    marginTop: 6,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  helper: {
    marginTop: 8,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  locationMode: {
    height: 58,
    flexDirection: 'row',
    borderRadius: 29,
    padding: 5,
    backgroundColor: theme.colors.surfaceSoft,
  },
  locationOption: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  locationActive: {
    backgroundColor: theme.colors.green,
  },
  locationActiveText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.white,
  },
  locationInactiveText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  updateLocation: {
    marginTop: 14,
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#42999B',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  updateLocationText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.white,
  },
  coordinates: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  stillNeeded: {
    marginTop: 22,
    paddingHorizontal: 12,
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  submit: {
    marginTop: 36,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.white,
  },
});
