import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getAddedPlaces } from '@/features/profile/added-service';
import { router } from 'expo-router';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionLoadingModal } from '@/components/action-loading-modal';
import { AppHeader } from '@/components/app-header';
import { RequestErrorState } from '@/components/request-error-state';
import {
  ProfilePlaceTab,
  ProfilePlaceTabs,
} from '@/components/profile-place-tabs';
import { ProfileGridToolbar } from '@/components/profile-grid-toolbar';
import { ProfilePlaceGrid } from '@/components/profile-place-grid';
import {
  getMyProfile,
  updateMyProfile,
} from '@/features/profile/profile-service';
import { getVisitedPlaces } from '@/features/profile/visited-service';
import { getSavedPlaces } from '@/features/profile/saved-service';
import { logout } from '@/features/auth/auth-service';
import { resetAccountScopedState } from '@/features/auth/session-state';
import { useBookmarkStore } from '@/store/bookmarks';
import { getAppError } from '@/services/api/error-utils';
import { deletePlace } from '@/services/api/place-service';
import {
  deleteCloudinaryUploadByToken,
  uploadImageToCloudinary,
} from '@/services/api/cloudinary-service';
import { theme } from '@/theme';

const PROFILE_PAGE_SIZE = 9;

function SavingDots() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((current) =>
        current >= 3 ? 1 : current + 1
      );
    }, 320);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Text style={styles.savingDots}>
      {'.'.repeat(dotCount)}
    </Text>
  );
}

export default function ProfileScreen() {
  const [editVisible, setEditVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileActionLabel, setProfileActionLabel] =
    useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editProfileImageUrl, setEditProfileImageUrl] = useState('');
  const [selectedProfileImageUri, setSelectedProfileImageUri] =
    useState<string | null>(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfilePlaceTab>('saved');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [search]);

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });

  const savedQuery = useInfiniteQuery({
    queryKey: [
      'profile',
      'me',
      'saved',
      debouncedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: ({ pageParam }) =>
      getSavedPlaces(
        pageParam,
        PROFILE_PAGE_SIZE,
        debouncedSearch,
        sortField,
        sortDirection
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    staleTime: 2 * 60_000,
    enabled: activeTab === 'saved',
  });

  const addedQuery = useInfiniteQuery({
    queryKey: [
      'profile',
      'me',
      'added',
      debouncedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: ({ pageParam }) =>
      getAddedPlaces(
        pageParam,
        PROFILE_PAGE_SIZE,
        debouncedSearch,
        sortField,
        sortDirection
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    staleTime: 2 * 60_000,
    enabled: activeTab === 'added',
  });

  const visitedQuery = useInfiniteQuery({
    queryKey: [
      'profile',
      'me',
      'visited',
      debouncedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: ({ pageParam }) =>
      getVisitedPlaces(
        pageParam,
        PROFILE_PAGE_SIZE,
        debouncedSearch,
        sortField,
        sortDirection
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    staleTime: 2 * 60_000,
    enabled: activeTab === 'visited',
  });

  const profile = profileQuery.data ?? null;

  const savedPlaces =
    savedQuery.data?.pages.flatMap((page) =>
      page.content.map((bookmark) => ({
        id: bookmark.place.id,
        name: bookmark.place.name,
        image: bookmark.place.thumbnailUrl ?? undefined,
      }))
    ) ?? [];

  const addedPlaces =
    addedQuery.data?.pages.flatMap((page) =>
      page.content.map((place) => ({
        id: place.id,
        name: place.name,
        image: place.thumbnailUrl ?? undefined,
      }))
    ) ?? [];

  const visitedPlaces =
    visitedQuery.data?.pages.flatMap((page) =>
      page.content.map((item) => ({
        id: item.place.id,
        name: item.place.name,
        image: item.place.images[0] ?? undefined,
      }))
    ) ?? [];

  const loading = profileQuery.isPending;

  const xp = profile?.points ?? 0;

  const xpRanks = [
    { name: 'Newbie', min: 0, max: 50 },
    { name: 'Explorer', min: 50, max: 150 },
    { name: 'Adventurer', min: 150, max: 300 },
    { name: 'Pathfinder', min: 300, max: 500 },
    { name: 'Trailblazer', min: 500, max: 700 },
    { name: 'Elite', min: 700, max: 850 },
    { name: 'Master', min: 850, max: 1000 },
    { name: 'Legend', min: 1000, max: null },
  ] as const;

  const currentRankIndex =
    xpRanks.findIndex(
      (rank) =>
        xp >= rank.min &&
        (rank.max === null || xp < rank.max)
    );

  const currentRank =
    xpRanks[currentRankIndex >= 0 ? currentRankIndex : 0];

  const nextRank =
    currentRankIndex >= 0 &&
    currentRankIndex < xpRanks.length - 1
      ? xpRanks[currentRankIndex + 1]
      : null;

  const rankProgress =
    currentRank.max === null
      ? 1
      : Math.min(
          1,
          Math.max(
            0,
            (xp - currentRank.min) /
              (currentRank.max - currentRank.min)
          )
        );

  async function openContactLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Could not open contact',
        'Please try again or contact the organisation manually.'
      );
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      // logout() clears local authentication in its cleanup path,
      // so the user can still safely return to guest Home.
      console.log('Logout request failed:', error);
    }

    setLoggingOut(false);

    // Logout returns to the public landing experience, not Sign In.
    router.replace('/');

    // Clear account-specific cached state after leaving Profile so the
    // guest Home transition is not blocked by cache cleanup work.
    requestAnimationFrame(() => {
      void resetAccountScopedState({
        clearAuthIntent: true,
      });
    });
  }

  function openEditProfile() {
    setEditDisplayName(profile?.displayName ?? '');
    setEditUsername(profile?.username ?? '');
    setEditProfileImageUrl(profile?.profileImage ?? '');
    setSelectedProfileImageUri(null);
    setRemoveProfileImage(false);
    setEditVisible(true);
  }

  function handleCancelEditProfile() {
    if (savingProfile) {
      return;
    }

    setSelectedProfileImageUri(null);
    setRemoveProfileImage(false);
    setEditVisible(false);
  }

  function handleRemoveProfilePhoto() {
    setSelectedProfileImageUri(null);
    setRemoveProfileImage(true);
  }

  async function handleChooseProfilePhoto() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Photo permission required',
        'Twende needs access to your photos to choose a profile image.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedProfileImageUri(result.assets[0].uri);
      setRemoveProfileImage(false);
    }
  }

  async function handleTakeProfilePhoto() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Camera permission required',
        'Twende needs camera access to take a profile photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedProfileImageUri(result.assets[0].uri);
      setRemoveProfileImage(false);
    }
  }

  async function handleSaveProfile() {
    let uploadedDeleteToken: string | null = null;

    try {
      setSavingProfile(true);

      let profileImageUrl = removeProfileImage
        ? ''
        : editProfileImageUrl.trim();

      if (selectedProfileImageUri) {
        const upload = await uploadImageToCloudinary(
          selectedProfileImageUri
        );

        profileImageUrl = upload.url;
        uploadedDeleteToken = upload.deleteToken;
      }

      const updatedProfile = await updateMyProfile({
        displayName: editDisplayName.trim(),
        username: editUsername.trim(),
        profileImageUrl,
      });

      queryClient.setQueryData(
        ['profile', 'me'],
        updatedProfile
      );

      setSelectedProfileImageUri(null);
      setRemoveProfileImage(false);
      setEditVisible(false);
    } catch (error: any) {
      if (uploadedDeleteToken) {
        await Promise.allSettled([
          deleteCloudinaryUploadByToken(uploadedDeleteToken),
        ]);
      }

      Alert.alert(
        'Profile update failed',
        error?.response?.data?.message ??
          error?.message ??
          'Check the details and try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <View style={styles.container}>
      <ActionLoadingModal
        visible={loggingOut}
        label="Logging out..."
      />
      <ActionLoadingModal
        visible={profileActionLabel !== null}
        label={profileActionLabel ?? ''}
      />

      <AppHeader
        rightAction={
          <Pressable
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
          >
            <Ionicons
              name="menu-outline"
              size={27}
              color={theme.colors.text}
            />
          </Pressable>
        }
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuModal}>
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          />

          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>

              <Pressable
                style={styles.menuClose}
                onPress={() => setMenuVisible(false)}
                accessibilityLabel="Close menu"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuContent}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => setMenuVisible(false)}
              >
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={theme.colors.text}
                />
                <Text style={styles.menuItemText}>Profile</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  openEditProfile();
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={21}
                  color={theme.colors.text}
                />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);

                  requestAnimationFrame(() => {
                    setReportVisible(true);
                  });
                }}
              >
                <Ionicons
                  name="warning-outline"
                  size={21}
                  color={theme.colors.green}
                />
                <View style={styles.menuItemCopy}>
                  <Text style={styles.menuItemText}>
                    Report Environmental Incident
                  </Text>
                  <Text style={styles.menuItemHint}>
                    Deforestation, poaching, pollution and more
                  </Text>
                </View>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setActiveTab('saved');
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={21}
                  color={theme.colors.text}
                />
                <Text style={styles.menuItemText}>Saved Places</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setActiveTab('added');
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={21}
                  color={theme.colors.text}
                />
                <Text style={styles.menuItemText}>My Contributions</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setActiveTab('visited');
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={theme.colors.text}
                />
                <Text style={styles.menuItemText}>Visited Places</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              {[
                ['settings-outline', 'Settings'],
                ['help-circle-outline', 'Help & Support'],
                ['shield-checkmark-outline', 'Privacy & Safety'],
                ['information-circle-outline', 'About Twende'],
              ].map(([icon, label]) => (
                <Pressable
                  key={label}
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    Alert.alert(label, 'This section will be added later.');
                  }}
                >
                  <Ionicons
                    name={icon as any}
                    size={21}
                    color={theme.colors.text}
                  />
                  <Text style={styles.menuItemText}>{label}</Text>
                </Pressable>
              ))}

              <View style={styles.menuDivider} />

              <Pressable
                style={styles.menuItem}
                disabled={loggingOut}
                onPress={() => {
                  setMenuVisible(false);

                  Alert.alert(
                    'Log out',
                    'Are you sure you want to log out?',
                    [
                      {
                        text: 'No',
                        style: 'cancel',
                      },
                      {
                        text: 'Yes',
                        style: 'destructive',
                        onPress: () => {
                          void handleLogout();
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={theme.colors.danger}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    styles.menuLogoutText,
                  ]}
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileTop}>
            <View style={styles.skeletonAvatar} />

            <View style={styles.profileInfo}>
              <View style={[styles.skeletonLine, styles.skeletonName]} />
              <View style={[styles.skeletonLine, styles.skeletonUsername]} />
              <View style={[styles.skeletonLine, styles.skeletonEmail]} />
            </View>

            <View style={styles.profileActions}>
              <View style={styles.skeletonActionButton} />
              <View style={styles.skeletonActionButton} />
            </View>
          </View>

          <View style={styles.pointsCard}>
            <View>
              <View style={[styles.skeletonLine, styles.skeletonPointsLabel]} />
              <View style={[styles.skeletonLine, styles.skeletonPointsValue]} />
            </View>

            <View style={styles.skeletonXpIcon} />
          </View>

          <View style={styles.skeletonTabs}>
            <View style={styles.skeletonTab} />
            <View style={styles.skeletonTab} />
            <View style={styles.skeletonTab} />
          </View>

          <View style={styles.tabContent}>
            <View style={styles.skeletonToolbar}>
              <View style={styles.skeletonSearch} />
              <View style={styles.skeletonSort} />
            </View>

            <View style={styles.skeletonGrid}>
              <View style={styles.skeletonGridItem} />
              <View style={styles.skeletonGridItem} />
              <View style={styles.skeletonGridItem} />
              <View style={styles.skeletonGridItem} />
            </View>
          </View>
        </ScrollView>
      ) : profileQuery.error ? (
        <RequestErrorState
          error={profileQuery.error}
          title="Could not load your profile"
          fallbackMessage="Your profile could not be loaded right now. Please try again."
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileTop}>
            {profile?.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons
                  name="person"
                  size={34}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {profile?.displayName ?? 'Twende User'}
              </Text>

              <Text style={styles.username}>
                @{profile?.username ?? 'username'}
              </Text>

              {profile?.email && (
                <Text
                  style={styles.email}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {profile.email}
                </Text>
              )}

              <Pressable
                style={styles.editProfileButton}
                onPress={openEditProfile}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={theme.colors.text}
                />
                <Text style={styles.editProfileText}>
                  Edit Profile
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.rankSection}>
            <View style={styles.rankTopRow}>
              <View>
                <Text style={styles.rankEyebrow}>RANK</Text>
                <Text style={styles.rankName}>
                  {currentRank.name}
                </Text>
              </View>

              <View style={styles.rankXp}>
                <Ionicons
                  name="flash"
                  size={18}
                  color={theme.colors.accent}
                />
                <Text style={styles.rankXpValue}>
                  {xp} XP
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${rankProgress * 100}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.rankFooter}>
              <Text style={styles.rankHint}>
                Earn XP by exploring and contributing places.
              </Text>

              {nextRank ? (
                <Text style={styles.nextRank}>
                  Next: {nextRank.name} · {nextRank.min} XP
                </Text>
              ) : (
                <Text style={styles.nextRank}>
                  Highest rank reached
                </Text>
              )}
            </View>
          </View>

          <ProfilePlaceTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            fullBleed
          />

          <View style={styles.tabContent}>
            {activeTab === 'saved' && (
              <>
                <View style={styles.toolbarInset}>
                  <ProfileGridToolbar
                    search={search}
                    onSearchChange={setSearch}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={(field, direction) => {
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  />
                </View>

                {savedQuery.isPending ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : savedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>
                      No saved places yet
                    </Text>
                  </View>
                ) : (
                  <ProfilePlaceGrid
                    ownProfileLayout
                    places={savedPlaces}
                    showMore={savedQuery.hasNextPage}
                    loadingMore={savedQuery.isFetchingNextPage}
                    onMore={() => {
                      void savedQuery.fetchNextPage();
                    }}
                    onPressPlace={(place) =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: place.id },
                      })
                    }
                    actionLabel="Remove"
                    onPrimaryAction={async (place) => {
                      if (profileActionLabel) {
                        return;
                      }

                      try {
                        setProfileActionLabel('Removing...');

                        await removeBookmark(place.id);

                        await queryClient.invalidateQueries({
                          queryKey: ['profile', 'me', 'saved'],
                        });

                        Alert.alert(
                          'Removed',
                          `${place.name} was removed from your saved places.`
                        );
                      } catch (error) {
                        const appError = getAppError(
                          error,
                          'Could not remove this place. Please try again.'
                        );

                        Alert.alert(
                          'Could not remove place',
                          appError.message
                        );
                      } finally {
                        setProfileActionLabel(null);
                      }
                    }}
                  />
                )}
              </>
            )}

            {activeTab === 'added' && (
              <>
                <View style={styles.toolbarInset}>
                  <ProfileGridToolbar
                    search={search}
                    onSearchChange={setSearch}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={(field, direction) => {
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  />
                </View>

                {addedQuery.isPending ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : addedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>
                      No places added
                    </Text>

                    <Pressable
                      style={styles.emptyAction}
                      onPress={() => router.push('/add')}
                    >
                      <Ionicons
                        name="add"
                        size={24}
                        color={theme.colors.white}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <ProfilePlaceGrid
                    ownProfileLayout
                    places={addedPlaces}
                    showMore={addedQuery.hasNextPage}
                    loadingMore={addedQuery.isFetchingNextPage}
                    onMore={() => {
                      void addedQuery.fetchNextPage();
                    }}
                    onPressPlace={(place) =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: place.id },
                      })
                    }
                    actionLabel="Edit"
                    secondaryActionLabel="Delete"
                    onPrimaryAction={(place) => {
                      router.push({
                        pathname: '/add',
                        params: { edit: place.id },
                      });
                    }}
                    onSecondaryAction={(place) => {
                      if (profileActionLabel) {
                        return;
                      }

                      Alert.alert(
                        'Delete place',
                        `Are you sure you want to delete "${place.name}"?\n\nThis action cannot be undone.`,
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              if (profileActionLabel) {
                                return;
                              }

                              try {
                                setProfileActionLabel('Deleting...');

                                await deletePlace(place.id);

                                await queryClient.invalidateQueries({
                                  queryKey: [
                                    'profile',
                                    'me',
                                    'added',
                                  ],
                                });

                                Alert.alert(
                                  'Place deleted',
                                  `${place.name} was deleted successfully.`
                                );
                              } catch (error) {
                                const appError = getAppError(
                                  error,
                                  'Could not delete this place. Please try again.'
                                );

                                Alert.alert(
                                  'Could not delete place',
                                  appError.message
                                );
                              } finally {
                                setProfileActionLabel(null);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  />
                )}
              </>
            )}

            {activeTab === 'visited' && (
              <>
                <View style={styles.toolbarInset}>
                  <ProfileGridToolbar
                    search={search}
                    onSearchChange={setSearch}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={(field, direction) => {
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  />
                </View>

                {visitedQuery.isPending ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : visitedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>
                      No places explored yet
                    </Text>

                    <Pressable
                      style={styles.exploreButton}
                      onPress={() => router.push('/explore')}
                    >
                      <Text style={styles.exploreButtonText}>
                        Explore
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <ProfilePlaceGrid
                    ownProfileLayout
                    places={visitedPlaces}
                    showMore={visitedQuery.hasNextPage}
                    loadingMore={visitedQuery.isFetchingNextPage}
                    onMore={() => {
                      void visitedQuery.fetchNextPage();
                    }}
                    onPressPlace={(place) =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: place.id },
                      })
                    }
                  />
                )}
              </>
            )}

            {activeTab === 'list' && (
              <View style={styles.listComingSoon}>
                <Ionicons
                  name="list-outline"
                  size={28}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.listComingSoonText}>
                  Coming soon
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}


      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportVisible(false)}
      >
        <View style={styles.reportBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setReportVisible(false)}
          />

          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderCopy}>
                <Text style={styles.reportTitle}>
                  Report Environmental Incident
                </Text>

                <Text style={styles.reportSubtitle}>
                  Kenya environmental and wildlife reporting contacts
                </Text>
              </View>

              <Pressable
                style={styles.reportClose}
                onPress={() => setReportVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close environmental incident report"
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reportContent}
            >
              <View style={styles.reportSection}>
                <View style={styles.reportSectionHeading}>
                  <Ionicons
                    name="leaf-outline"
                    size={21}
                    color={theme.colors.green}
                  />

                  <Text style={styles.reportSectionTitle}>
                    NEMA
                  </Text>
                </View>

                <Text style={styles.reportBody}>
                  For environmental incidents such as pollution,
                  illegal dumping, wildfire, deforestation and other
                  environmental threats, contact the National
                  Environment Management Authority.
                </Text>

                <Pressable
                  style={styles.reportContactRow}
                  onPress={() =>
                    void openContactLink('tel:0741101100')
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accent}
                  />

                  <Text style={styles.reportContactText}>
                    0741 101 100
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.reportContactRow}
                  onPress={() =>
                    void openContactLink('tel:0786101100')
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accent}
                  />

                  <Text style={styles.reportContactText}>
                    0786 101 100
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.reportContactRow}
                  onPress={() =>
                    void openContactLink(
                      'mailto:incidence@nema.go.ke'
                    )
                  }
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={theme.colors.accent}
                  />

                  <Text style={styles.reportContactText}>
                    incidence@nema.go.ke
                  </Text>
                </Pressable>

                <Text style={styles.reportNote}>
                  The Incident Desk is staffed by the Compliance and
                  Enforcement Team from 8 am to 5 pm on normal working
                  days. An automated answering service is available
                  outside those hours.
                </Text>
              </View>

              <View style={styles.reportDivider} />

              <View style={styles.reportSection}>
                <View style={styles.reportSectionHeading}>
                  <Ionicons
                    name="paw-outline"
                    size={21}
                    color={theme.colors.green}
                  />

                  <Text style={styles.reportSectionTitle}>
                    Kenya Wildlife Service
                  </Text>
                </View>

                <Text style={styles.reportBody}>
                  For poaching or wildlife crime incidents, contact
                  Kenya Wildlife Service directly.
                </Text>

                <Pressable
                  style={styles.reportContactRow}
                  onPress={() =>
                    void openContactLink('tel:0700709000')
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accent}
                  />

                  <View>
                    <Text style={styles.reportContactLabel}>
                      National Emergency Line
                    </Text>

                    <Text style={styles.reportContactText}>
                      0700 709 000
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.reportContactRow}
                  onPress={() =>
                    void openContactLink('tel:0733709000')
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.accent}
                  />

                  <View>
                    <Text style={styles.reportContactLabel}>
                      KWS Hotline
                    </Text>

                    <Text style={styles.reportContactText}>
                      0733 709 000
                    </Text>
                  </View>
                </Pressable>

                <Text style={styles.reportNote}>
                  You may also report a poaching or wildlife crime
                  incident to the nearest police station.
                </Text>
              </View>

              <View style={styles.reportEmergencyNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={theme.colors.textSecondary}
                />

                <Text style={styles.reportEmergencyText}>
                  If there is immediate danger to people, contact the
                  appropriate emergency services first.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEditProfile}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit profile</Text>

            <TextInput
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Display name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
              style={styles.modalInput}
            />
            <TextInput
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Username"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              style={styles.modalInput}
            />
            <View style={styles.profileImageEditor}>
              {removeProfileImage ? (
                <View style={styles.editProfileImageFallback}>
                  <Ionicons
                    name="person"
                    size={26}
                    color={theme.colors.textSecondary}
                  />
                </View>
              ) : selectedProfileImageUri || editProfileImageUrl ? (
                <Image
                  source={{
                    uri:
                      selectedProfileImageUri ??
                      editProfileImageUrl,
                  }}
                  style={styles.editProfileImage}
                />
              ) : (
                <View style={styles.editProfileImageFallback}>
                  <Ionicons
                    name="person"
                    size={26}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}

              <View style={styles.profileImageActions}>
                <Pressable
                  style={styles.profileImageButton}
                  onPress={handleChooseProfilePhoto}
                  disabled={savingProfile}
                >
                  <Ionicons
                    name="images-outline"
                    size={17}
                    color={theme.colors.text}
                  />
                  <Text style={styles.profileImageButtonText}>
                    Choose photo
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.profileImageButton}
                  onPress={handleTakeProfilePhoto}
                  disabled={savingProfile}
                >
                  <Ionicons
                    name="camera-outline"
                    size={17}
                    color={theme.colors.text}
                  />
                  <Text style={styles.profileImageButtonText}>
                    Take photo
                  </Text>
                </Pressable>

                {(selectedProfileImageUri ||
                  (!removeProfileImage && editProfileImageUrl)) && (
                  <Pressable
                    style={styles.profileImageButton}
                    onPress={handleRemoveProfilePhoto}
                    disabled={savingProfile}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={theme.colors.danger}
                    />
                    <Text style={styles.removePhotoText}>
                      Remove photo
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelEditProfile}
                disabled={savingProfile}
              >
                <Text style={styles.modalButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  Save
                </Text>
              </Pressable>
            </View>

            {savingProfile && (
              <View style={styles.savingOverlay}>
                <View style={styles.savingPopup}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accent}
                  />

                  <View style={styles.savingCopy}>
                    <Text style={styles.savingText}>
                      Saving photo
                    </Text>

                    <SavingDots />
                  </View>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  skeletonAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonLine: {
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonName: {
    width: '70%',
    height: 20,
  },
  skeletonUsername: {
    width: '48%',
    height: 14,
    marginTop: 9,
  },
  skeletonEmail: {
    width: '82%',
    height: 13,
    marginTop: 8,
  },
  skeletonActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonPointsLabel: {
    width: 38,
    height: 13,
  },
  skeletonPointsValue: {
    width: 72,
    height: 32,
    marginTop: 9,
  },
  skeletonXpIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonTabs: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  skeletonTab: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  skeletonSearch: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonSort: {
    width: 54,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonGridItem: {
    width: '48%',
    height: 140,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuModal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuPanel: {
    width: '82%',
    maxWidth: 340,
    height: '100%',
    paddingTop: 48,
    backgroundColor: theme.colors.background,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  menuHeader: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  menuClose: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    paddingVertical: 10,
    paddingBottom: 28,
  },
  menuItem: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemCopy: {
    flex: 1,
  },
  menuItemText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  menuItemHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 18,
    backgroundColor: theme.colors.border,
  },
  menuLogoutText: {
    color: theme.colors.danger,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  username: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.green,
  },
  email: {
    marginTop: 3,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    minHeight: 34,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pointsCard: {
    marginTop: 16,
    minHeight: 78,
    paddingHorizontal: 2,
    paddingVertical: 14,
  },
  rankSection: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  rankTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rankEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: theme.colors.textSecondary,
  },
  rankName: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  rankXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rankXpValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  progressTrack: {
    marginTop: 13,
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  rankFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rankHint: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
  },
  nextRank: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.green,
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptyAction: {
    marginTop: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  exploreButton: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
  seeMoreButton: {
    alignSelf: 'center',
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  seeMoreText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    minHeight: 150,
    marginHorizontal: -16,
  },
  toolbarInset: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  listComingSoon: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  listComingSoonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.green,
  },
  emptyCard: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 18,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  editModal: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reportBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  reportModal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 18,
    paddingRight: 10,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  reportHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  reportTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  reportSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  reportClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  reportSection: {
    gap: 12,
  },
  reportSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportSectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  reportBody: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  reportContactRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  reportContactLabel: {
    marginBottom: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  reportContactText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  reportNote: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  reportDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
    backgroundColor: theme.colors.border,
  },
  reportEmergencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  reportEmergencyText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  profileImageEditor: {
    marginBottom: 14,
    alignItems: 'center',
  },
  editProfileImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 14,
  },
  editProfileImageFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  profileImageActions: {
    width: '100%',
  },
  profileImageButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  profileImageButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  removePhotoText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    minWidth: 76,
    alignItems: 'center',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButton: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  savingPopup: {
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  savingCopy: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  savingText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  savingDots: {
    width: 24,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
