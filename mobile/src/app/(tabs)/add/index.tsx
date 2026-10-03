import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionLoadingModal } from '@/components/action-loading-modal';
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
import { getAppError } from '@/services/api/error-utils';
import { createPlace, getPlace, updatePlace } from '@/services/api/place-service';
import { useLocationSelectionStore } from '@/store/location-selection';
import { theme } from '@/theme';

type AddPlaceField =
  | 'name'
  | 'category'
  | 'county'
  | 'description'
  | 'photos'
  | 'location';

type AddPlaceFormErrors = Record<AddPlaceField, boolean>;

const EMPTY_FORM_ERRORS: AddPlaceFormErrors = {
  name: false,
  category: false,
  county: false,
  description: false,
  photos: false,
  location: false,
};

export default function AddPlaceScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const queryClient = useQueryClient();
  const isEditing = Boolean(edit);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [showCategories, setShowCategories] = useState(false);
  const [showCounties, setShowCounties] = useState(false);
  const [countySearch, setCountySearch] = useState('');

  const categorySelectRef = useRef<View>(null);
  const countySelectRef = useRef<View>(null);

  const [categoryMenuLayout, setCategoryMenuLayout] = useState({
    top: 0,
    left: 10,
    width: 0,
  });

  const [countyMenuLayout, setCountyMenuLayout] = useState({
    top: 0,
    left: 10,
    width: 0,
  });

  const [categoryAtEnd, setCategoryAtEnd] = useState(false);
  const [countyAtEnd, setCountyAtEnd] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formErrors, setFormErrors] =
    useState<AddPlaceFormErrors>(EMPTY_FORM_ERRORS);

  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const countyInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const fieldY = useRef<Record<AddPlaceField, number>>({
    name: 0,
    category: 0,
    county: 0,
    description: 0,
    photos: 0,
    location: 0,
  });

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedLocation =
    useLocationSelectionStore((state) => state.selectedLocation);

  const clearSelectedLocation =
    useLocationSelectionStore((state) => state.clearSelectedLocation);

  /* eslint-disable react-hooks/set-state-in-effect --
   * selectedLocation is external Zustand state returned from the map screen.
   * This effect intentionally synchronizes that external selection into the
   * local form before clearing the handoff value.
   */
  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    setLatitude(selectedLocation.latitude);
    setLongitude(selectedLocation.longitude);
    setFormErrors((current) =>
      current.location
        ? { ...current, location: false }
        : current
    );
    clearSelectedLocation();
  }, [selectedLocation, clearSelectedLocation]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => console.log('Failed to load categories:', error));

    getCounties()
      .then(setCounties)
      .catch((error) => console.log('Failed to load counties:', error));
  }, []);


  useEffect(() => {
    if (edit) {
      return;
    }

    setName('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedCounty(null);
    setCountySearch('');
    setImages([]);
    setLatitude(null);
    setLongitude(null);
    setShowCategories(false);
    setShowCounties(false);
    setFormErrors(EMPTY_FORM_ERRORS);
  }, [edit]);

  useEffect(() => {
    if (!edit || categories.length === 0 || counties.length === 0) {
      return;
    }

    let cancelled = false;
    const placeId = edit;

    async function loadPlaceForEdit() {
      try {
        const place = await getPlace(placeId);

        if (cancelled) {
          return;
        }

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
      } catch (error) {
        if (cancelled) {
          return;
        }

        const appError = getAppError(
          error,
          'Could not load this place for editing.'
        );

        Alert.alert(
          'Could not load place',
          appError.message
        );
      }
    }

    void loadPlaceForEdit();

    return () => {
      cancelled = true;
    };
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

      setImages((current) => {
        const next = [...current, ...selected].slice(0, 10);

        if (next.length >= 2) {
          setFormErrors((errors) =>
            errors.photos
              ? { ...errors, photos: false }
              : errors
          );
        }

        return next;
      });
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

      setImages((current) => {
        const next = [...current, photoUri].slice(0, 10);

        if (next.length >= 2) {
          setFormErrors((errors) =>
            errors.photos
              ? { ...errors, photos: false }
              : errors
          );
        }

        return next;
      });
    }
  }



  function clearFieldError(field: AddPlaceField) {
    setFormErrors((current) =>
      current[field]
        ? { ...current, [field]: false }
        : current
    );
  }

  function goToInvalidField(field: AddPlaceField) {
    setShowCategories(false);
    setShowCounties(false);

    scrollRef.current?.scrollTo({
      y: Math.max(fieldY.current[field] - 12, 0),
      animated: true,
    });

    requestAnimationFrame(() => {
      if (field === 'name') {
        nameInputRef.current?.focus();
      } else if (field === 'county') {
        countyInputRef.current?.focus();
      } else if (field === 'description') {
        descriptionInputRef.current?.focus();
      }
    });
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    const nextErrors: AddPlaceFormErrors = {
      name: !name.trim(),
      category: !selectedCategory,
      county: !selectedCounty,
      description: !description.trim(),
      photos: images.length < 2,
      location: latitude === null || longitude === null,
    };

    setFormErrors(nextErrors);

    const fieldOrder: AddPlaceField[] = [
      'name',
      'category',
      'county',
      'description',
      'photos',
      'location',
    ];

    const firstInvalidField = fieldOrder.find(
      (field) => nextErrors[field]
    );

    if (firstInvalidField) {
      goToInvalidField(firstInvalidField);
      return;
    }

    if (
      !selectedCategory ||
      !selectedCounty ||
      latitude === null ||
      longitude === null
    ) {
      return;
    }

    const category = selectedCategory;
    const county = selectedCounty;
    const placeLatitude = latitude;
    const placeLongitude = longitude;

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
        category: category.slug,
        countyCode: county.code,
        description: description.trim(),
        latitude: placeLatitude,
        longitude: placeLongitude,
        images: uploadedUrls,
      };

      if (isEditing && edit) {
        await updatePlace(edit, payload);

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['feed'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['profile', 'me', 'added'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['nearby'],
            refetchType: 'all',
          }),
        ]);

        Alert.alert(
          'Place updated',
          'Your changes were saved successfully.'
        );

        router.replace('/');
      } else {
        await createPlace(payload);

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['feed'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['profile', 'me', 'added'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['nearby'],
            refetchType: 'all',
          }),
        ]);

        setName('');
        setDescription('');
        setSelectedCategory(null);
        setSelectedCounty(null);
        setCountySearch('');
        setImages([]);
        setLatitude(null);
        setLongitude(null);
        setShowCategories(false);
        setShowCounties(false);

        Alert.alert(
          'Place added',
          'Your place was added successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/'),
            },
          ],
          {
            cancelable: false,
          }
        );
      }
    } catch (error) {
      if (uploadedDeleteTokens.length > 0) {
        await Promise.allSettled(
          uploadedDeleteTokens.map((deleteToken) =>
            deleteCloudinaryUploadByToken(deleteToken)
          )
        );
      }

      const appError = getAppError(
        error,
        isEditing
          ? 'Could not update this place. Please try again.'
          : 'Could not add this place. Please try again.'
      );

      Alert.alert(
        isEditing ? 'Could not update place' : 'Could not add place',
        appError.message
      );

      if (isEditing) {
        router.replace('/');
      }
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

      const nextLatitude = Number(location.coords.latitude.toFixed(6));
      const nextLongitude = Number(location.coords.longitude.toFixed(6));
      const gpsAccuracy = location.coords.accuracy ?? null;

      if (gpsAccuracy !== null && gpsAccuracy > 50) {
        Alert.alert(
          'Low GPS accuracy',
          `Your current GPS accuracy is about ±${Math.round(
            gpsAccuracy
          )} m. Use the satellite picker for a more precise location.`,
          [
            {
              text: 'Use anyway',
              onPress: () => {
                setLatitude(nextLatitude);
                setLongitude(nextLongitude);
                clearFieldError('location');
                clearFieldError('location');
              },
            },
            {
              text: 'Satellite picker',
              onPress: () => router.push('/location/picker'),
            },
          ]
        );

        return;
      }

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
    } catch {
      Alert.alert('Location error', 'Could not get your current location.');
    } finally {
      setGettingLocation(false);
    }
  }

  const categoryPriority: Record<string, number> = {
    waterfall: 0,
    views: 1,
  };

  const displayedCategories = [...categories].sort((a, b) => {
    const aPriority = categoryPriority[a.slug] ?? 100;
    const bPriority = categoryPriority[b.slug] ?? 100;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.screen}>
      <ActionLoadingModal
        visible={submitting}
        label={isEditing ? 'Updating...' : 'Submitting...'}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Add Place</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={!showCategories && !showCounties}
      >
        {(showCategories || showCounties) && (
          <Pressable
            style={styles.dropdownDismissLayer}
            onPress={() => {
              setShowCategories(false);
              setShowCounties(false);
            }}
          />
        )}

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.name = event.nativeEvent.layout.y;
          }}
        >
          Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          ref={nameInputRef}
          style={[
            styles.input,
            formErrors.name && styles.fieldErrorBorder,
          ]}
          placeholder="Name"
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={(value) => {
            setName(value);

            if (value.trim()) {
              clearFieldError('name');
            }
          }}
        />

        {formErrors.name && (
          <Text style={styles.fieldErrorText}>
            Name is required.
          </Text>
        )}

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.category = event.nativeEvent.layout.y;
          }}
        >
          Category <Text style={styles.required}>*</Text>
        </Text>

        <View ref={categorySelectRef}>
          <Pressable
            style={[
              styles.select,
              formErrors.category && styles.fieldErrorBorder,
            ]}
            onPress={() => {
              setShowCounties(false);

              categorySelectRef.current?.measureInWindow(
                (x, y, width, height) => {
                  setCategoryMenuLayout({
                    top: y + height + 4,
                    left: x,
                    width,
                  });

                  setShowCategories(true);
                }
              );
            }}
          >
            <Text style={styles.selectText}>
              {selectedCategory?.name ?? 'Select a category'}
            </Text>

            <Ionicons
              name={showCategories ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.text}
            />
          </Pressable>
        </View>

        {formErrors.category && (
          <Text style={styles.fieldErrorText}>
            Category is required.
          </Text>
        )}

        <Modal
          visible={showCategories}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setShowCategories(false)}
        >
          <View style={styles.categoryModalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowCategories(false)}
            />

            <View
              style={[
                styles.categoryModalMenu,
                {
                  top: categoryMenuLayout.top,
                  left: categoryMenuLayout.left,
                  width: categoryMenuLayout.width,
                },
              ]}
            >
              <ScrollView
                style={styles.categoryModalList}
                contentContainerStyle={styles.categoryModalContent}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator
                scrollEventThrottle={16}
                onScroll={({ nativeEvent }) => {
                  const {
                    layoutMeasurement,
                    contentOffset,
                    contentSize,
                  } = nativeEvent;

                  setCategoryAtEnd(
                    layoutMeasurement.height + contentOffset.y >=
                      contentSize.height - 12
                  );
                }}
              >
                {displayedCategories.map((category) => (
                  <Pressable
                    key={category.slug}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCategory(category);
                      clearFieldError('category');
                      setShowCategories(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {!categoryAtEnd && (
                <View
                  pointerEvents="none"
                  style={styles.moreOptionsHint}
                >
                  <Text style={styles.moreOptionsText}>
                    More options ↓
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.county = event.nativeEvent.layout.y;
          }}
        >
          County <Text style={styles.required}>*</Text>
        </Text>

        <View ref={countySelectRef}>
          <View
            style={[
              styles.countyTypeahead,
              formErrors.county && styles.fieldErrorBorder,
            ]}
          >
            <TextInput
              ref={countyInputRef}
              style={styles.countyTypeaheadInput}
              placeholder="County"
              placeholderTextColor={theme.colors.muted}
              value={
                showCounties
                  ? countySearch
                  : selectedCounty?.name ?? countySearch
              }
              onFocus={() => {
                setShowCategories(false);
                setCountySearch(selectedCounty?.name ?? countySearch);
                setCountyAtEnd(false);

                countySelectRef.current?.measureInWindow(
                  (x, y, width, height) => {
                    setCountyMenuLayout({
                      top: y + height + 4,
                      left: x,
                      width,
                    });

                    setShowCounties(true);
                  }
                );
              }}
              onChangeText={(value) => {
                setCountySearch(value);
                setSelectedCounty(null);
                setCountyAtEnd(false);
                setShowCounties(true);
              }}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.muted}
            />
          </View>
        </View>

        {formErrors.county && (
          <Text style={styles.fieldErrorText}>
            County is required.
          </Text>
        )}

        <Modal
          visible={showCounties}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setShowCounties(false)}
        >
          <View style={styles.categoryModalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowCounties(false)}
            />

            <View
              style={[
                styles.categoryModalMenu,
                {
                  top: countyMenuLayout.top,
                  left: countyMenuLayout.left,
                  width: countyMenuLayout.width,
                },
              ]}
            >
              <ScrollView
                style={styles.categoryModalList}
                contentContainerStyle={styles.categoryModalContent}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator
                scrollEventThrottle={16}
                onScroll={({ nativeEvent }) => {
                  const {
                    layoutMeasurement,
                    contentOffset,
                    contentSize,
                  } = nativeEvent;

                  setCountyAtEnd(
                    layoutMeasurement.height + contentOffset.y >=
                      contentSize.height - 12
                  );
                }}
              >
                {counties
                  .filter((county) =>
                    county.name
                      .toLowerCase()
                      .includes(countySearch.trim().toLowerCase())
                  )
                  .map((county) => (
                    <Pressable
                      key={county.code}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCounty(county);
                        setCountySearch(county.name);
                        clearFieldError('county');
                        setShowCounties(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {county.name}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>

              {!countyAtEnd && countySearch.trim() === '' && (
                <View
                  pointerEvents="none"
                  style={styles.moreOptionsHint}
                >
                  <Text style={styles.moreOptionsText}>
                    More counties ↓
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.description = event.nativeEvent.layout.y;
          }}
        >
          Description <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          ref={descriptionInputRef}
          style={[
            styles.description,
            formErrors.description && styles.fieldErrorBorder,
          ]}
          placeholder="What makes this place special?"
          placeholderTextColor={theme.colors.muted}
          value={description}
          onChangeText={(value) => {
            setDescription(value);

            if (value.trim()) {
              clearFieldError('description');
            }
          }}
          multiline
          textAlignVertical="top"
        />

        {formErrors.description && (
          <Text style={styles.fieldErrorText}>
            Description is required.
          </Text>
        )}

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.photos = event.nativeEvent.layout.y;
          }}
        >
          Photos (2–10) <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.photoManager}>
          <View style={styles.photoPreviewArea}>
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
          </View>

          {images.length < 10 && (
            <View style={styles.photoActions}>
              <Pressable
                style={styles.photoAction}
                onPress={handlePickImages}
              >
                <Ionicons
                  name="images-outline"
                  size={20}
                  color={theme.colors.text}
                />
                <Text style={styles.photoActionText}>Photos</Text>
              </Pressable>

              <Pressable
                style={styles.photoAction}
                onPress={handleTakePhoto}
              >
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={theme.colors.text}
                />
                <Text style={styles.photoActionText}>Camera</Text>
              </Pressable>
            </View>
          )}
        </View>

        {formErrors.photos && (
          <Text style={styles.fieldErrorText}>
            Add at least 2 photos.
          </Text>
        )}

        <Text
          style={styles.label}
          onLayout={(event) => {
            fieldY.current.location = event.nativeEvent.layout.y;
          }}
        >
          Location <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.locationActions}>
          <Pressable
            style={styles.satelliteButton}
            onPress={() => router.push('/location/picker')}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={theme.colors.white}
            />
            <Text style={styles.satelliteButtonText}>
              Satellite Picker
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.currentLocationButton,
              gettingLocation && styles.locationButtonDisabled,
            ]}
            onPress={handleCurrentLocation}
            disabled={gettingLocation}
          >
            <Ionicons
              name="locate-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.currentLocationButtonText}>
              {gettingLocation
                ? 'Getting location...'
                : 'Use Current Location'}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.locationStatus,
            formErrors.location && styles.fieldErrorBorder,
          ]}
        >
          <View style={styles.locationStatusIcon}>
            <Ionicons
              name={
                latitude !== null && longitude !== null
                  ? 'location'
                  : 'location-outline'
              }
              size={18}
              color={
                latitude !== null && longitude !== null
                  ? theme.colors.green
                  : theme.colors.muted
              }
            />
          </View>

          <View style={styles.locationStatusText}>
            <Text style={styles.locationStatusTitle}>
              {latitude !== null && longitude !== null
                ? 'Location selected'
                : 'No location selected'}
            </Text>

            <Text style={styles.coordinates}>
              {latitude !== null && longitude !== null
                ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : 'Choose a point on the map or use your current location.'}
            </Text>
          </View>
        </View>

        {formErrors.location && (
          <Text style={styles.fieldErrorText}>
            Location is required.
          </Text>
        )}

        <Pressable
          style={styles.submit}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {isEditing
              ? 'Save Changes'
              : 'Add Place · +10 XP'}
          </Text>
        </Pressable>
      </ScrollView>

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
  header: {
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    zIndex: 20,
  },
  content: {
    paddingTop: 4,
    paddingHorizontal: 10,
    paddingBottom: 62,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  label: {
    marginTop: 16,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  required: {
    color: theme.colors.danger,
  },
  fieldErrorBorder: {
    borderColor: theme.colors.danger,
  },
  fieldErrorText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    fontSize: 15,
    color: theme.colors.text,
  },
  select: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectWrap: {
    position: 'relative',
    zIndex: 1,
  },
  selectWrapOpen: {
    zIndex: 30,
    elevation: 30,
  },
  dropdownDismissLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 430,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    zIndex: 40,
    elevation: 12,
  },
  categoryModalRoot: {
    flex: 1,
  },
  categoryModalMenu: {
    position: 'absolute',
    height: 420,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    elevation: 20,
  },
  categoryModalList: {
    flex: 1,
  },
  categoryModalContent: {
    flexGrow: 0,
    paddingBottom: 30,
  },
  moreOptionsHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  moreOptionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  dropdownList: {
    maxHeight: 420,
  },
  dropdownItem: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dropdownText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  countyTypeahead: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  countyTypeaheadInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: 15,
    color: theme.colors.text,
  },
  description: {
    height: 130,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    fontSize: 15,
    color: theme.colors.text,
  },
  photoManager: {
    marginTop: 2,
  },
  photoPreviewArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 4,
  },
  imagePreviewWrap: {
    position: 'relative',
  },
  imagePreview: {
    width: 92,
    height: 92,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceSoft,
  },
  removeImage: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  photoAction: {
    width: 92,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSoft,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },

  locationActions: {
    gap: 8,
  },
  satelliteButton: {
    height: 48,
    borderRadius: 4,
    backgroundColor: '#42999B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  satelliteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
  currentLocationButton: {
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  currentLocationButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  locationButtonDisabled: {
    opacity: 0.55,
  },
  locationStatus: {
    marginTop: 10,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSoft,
  },
  locationStatusIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationStatusText: {
    flex: 1,
  },
  locationStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  coordinates: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  submit: {
    marginTop: 20,
    height: 48,
    borderRadius: 4,
    backgroundColor: theme.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.white,
  },
});
