import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { getAddedPlaces } from '@/features/profile/added-service';
import { router } from 'expo-router';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import {
  ProfilePlaceTab,
  ProfilePlaceTabs,
} from '@/components/profile-place-tabs';
import { ProfileGridToolbar } from '@/components/profile-grid-toolbar';
import { ProfilePlaceGrid } from '@/components/profile-place-grid';
import {
  getMyProfile,
  updateMyProfile,
  type MyProfile,
} from '@/features/profile/profile-service';
import { getVisitedPlaces } from '@/features/profile/visited-service';
import {
  getSavedPlaces,
  removeSavedPlace,
} from '@/features/profile/saved-service';
import { logout } from '@/features/auth/auth-service';
import { deletePlace } from '@/services/api/place-service';
import { theme } from '@/theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editProfileImageUrl, setEditProfileImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState<ProfilePlaceTab>('saved');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [savedPlaces, setSavedPlaces] = useState<
    { id: string; name: string; image?: string }[]
  >([]);
  const [addedPlaces, setAddedPlaces] = useState<
    { id: string; name: string; image?: string }[]
  >([]);
  const [visitedPlaces, setVisitedPlaces] = useState<
    { id: string; name: string; image?: string }[]
  >([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profileData, savedData, addedData, visitedData] = await Promise.all([
          getMyProfile(),
          getSavedPlaces(0, 8),
          getAddedPlaces(0, 8),
          getVisitedPlaces(0, 8),
        ]);

        setProfile(profileData);
        setSavedPlaces(
            savedData.content.map((bookmark) => ({
              id: bookmark.place.id,
              name: bookmark.place.name,
              image: bookmark.place.thumbnailUrl ?? undefined,
            }))
          );
        setAddedPlaces(
          addedData.content.map((place) => ({
            id: place.id,
            name: place.name,
            image: place.thumbnailUrl ?? undefined,
          }))
        );
        setVisitedPlaces(
          visitedData.content.map((item) => ({
            id: item.place.id,
            name: item.place.name,
            image: item.place.images[0] ?? undefined,
          }))
        );
      } catch {
        setProfile(null);
        setSavedPlaces([]);
        setAddedPlaces([]);
        setVisitedPlaces([]);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  function openEditProfile() {
    setEditDisplayName(profile?.displayName ?? '');
    setEditUsername(profile?.username ?? '');
    setEditProfileImageUrl(profile?.profileImage ?? '');
    setEditVisible(true);
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      const updatedProfile = await updateMyProfile({
        displayName: editDisplayName.trim(),
        username: editUsername.trim(),
        profileImageUrl: editProfileImageUrl.trim(),
      });
      setProfile(updatedProfile);
      setEditVisible(false);
    } catch {
      Alert.alert(
        'Profile update failed',
        'Check the details and try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
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
                <Text style={styles.email}>{profile.email}</Text>
              )}
            </View>

            <View style={styles.profileActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={openEditProfile}
                  accessibilityLabel="Edit profile"
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={theme.colors.text}
                  />
                </Pressable>

                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={theme.colors.danger}
                  />
                </Pressable>
            </View>
          </View>

          <View style={styles.pointsCard}>
            <View>
              <Text style={styles.pointsLabel}>XP</Text>
              <Text style={styles.pointsValue}>
                {profile?.points ?? 0}
              </Text>
            </View>

            <Ionicons
              name="flash-outline"
              size={32}
              color={theme.colors.accent}
            />
          </View>

          <ProfilePlaceTabs
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <View style={styles.tabContent}>
            {activeTab === 'saved' && (
              <>
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

                {savedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No saved places yet</Text>
                  </View>
                ) : (
                  <>
                    <ProfilePlaceGrid
                      places={savedPlaces}
                      actionLabel="Remove"
                      onPrimaryAction={async (place) => {
                        await removeSavedPlace(place.id);
                        setSavedPlaces((current) =>
                          current.filter((savedPlace) => savedPlace.id !== place.id)
                        );
                      }}
                    />

                    <Pressable style={styles.seeMoreButton}>
                      <Text style={styles.seeMoreText}>See more</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            {activeTab === 'added' && (
              <>
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

                {addedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No places added</Text>

                    <Pressable style={styles.emptyAction}>
                      <Ionicons
                        name="add"
                        size={24}
                        color={theme.colors.white}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <ProfilePlaceGrid
                    places={addedPlaces}
                    actionLabel="Edit"
                    secondaryActionLabel="Delete"
                    onPrimaryAction={(place) => {
                      router.push({
                        pathname: '/add',
                        params: { edit: place.id },
                      });
                    }}
                    onSecondaryAction={(place) => {
                      Alert.alert(
                        'Delete place',
                        `Delete "${place.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deletePlace(place.id);
                                setAddedPlaces((current) =>
                                  current.filter((item) => item.id !== place.id)
                                );
                              } catch (error: any) {
                                Alert.alert(
                                  'Delete failed',
                                  error?.response?.data?.message ??
                                    'Could not delete this place.'
                                );
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

                {visitedPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No places visited yet</Text>

                    <Pressable style={styles.exploreButton}>
                      <Text style={styles.exploreButtonText}>Explore</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ProfilePlaceGrid places={visitedPlaces} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}

      <BottomNav />

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
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
            <TextInput
              value={editProfileImageUrl}
              onChangeText={setEditProfileImageUrl}
              placeholder="Profile image URL"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditVisible(false)}
                disabled={savingProfile}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
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
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
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
   editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logoutButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  pointsCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  pointsValue: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
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
    marginTop: 16,
    minHeight: 150,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    minWidth: 88,
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
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
});
