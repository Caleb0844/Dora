import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addRecentPlace,
  getRecentPlaces,
  type RecentPlace,
} from '@/features/places/recent-search-service';
import {
  searchPlaces,
  type PlaceSummary,
} from '@/services/api/place-service';
import { theme } from '@/theme';

const PAGE_SIZE = 20;

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const searchRequestId = useRef(0);

  useEffect(() => {
    getRecentPlaces()
      .then(setRecents)
      .catch((error) => {
        console.log('Failed to load recent places:', error);
      });
  }, []);

  async function openPlace(
    place: PlaceSummary | RecentPlace
  ) {
    try {
      const updated = await addRecentPlace({
        id: place.id,
        name: place.name,
        category: place.category,
        county: place.county,
        thumbnailUrl: place.thumbnailUrl,
      });

      setRecents(updated);
    } catch (error) {
      console.log('Failed to save recent place:', error);
    }

    router.push({
      pathname: '/place/[id]',
      params: { id: place.id },
    });
  }

  async function runSearch(value: string) {
    const normalized = value.trim();
    const requestId = ++searchRequestId.current;

    if (!normalized) {
      setResults([]);
      setSearched(false);
      setPage(0);
      setLastPage(true);
      return;
    }

    try {
      const data = await searchPlaces(
        normalized,
        0,
        PAGE_SIZE
      );

      if (requestId !== searchRequestId.current) {
        return;
      }

      setResults(data.content);
      setPage(data.page);
      setLastPage(data.last);
      setSearched(true);
    } catch (error) {
      if (requestId !== searchRequestId.current) {
        return;
      }

      console.log('Search failed:', error);
      setResults([]);
      setSearched(true);
    } finally {
      // Request identity is still checked above so stale responses
      // cannot overwrite newer search results.
    }
  }

  async function handleSearch() {
    await runSearch(query);
  }

  useEffect(() => {
    const value = query.trim();

    if (!value) {
      return;
    }

    const timeout = setTimeout(() => {
      void runSearch(value);
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (value.trim()) {
      return;
    }

    // Invalidate any in-flight search so its response cannot repopulate
    // results after the user has cleared the field.
    searchRequestId.current += 1;

    setResults([]);
    setSearched(false);
    setPage(0);
    setLastPage(true);
  }

  async function loadMore() {
    if (
      loadingMore ||
      lastPage ||
      !query.trim()
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      const data = await searchPlaces(
        query,
        page + 1,
        PAGE_SIZE
      );

      setResults((current) => [
        ...current,
        ...data.content,
      ]);

      setPage(data.page);
      setLastPage(data.last);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>

          <Text style={styles.title}>
            Search
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.textSecondary}
          />

          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSearch}
            placeholder="Search by keyword"
            placeholderTextColor={
              theme.colors.textSecondary
            }
            returnKeyType="search"
            style={styles.input}
          />

          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No places found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.results}
          ListHeaderComponent={
            !query.trim() && recents.length > 0 ? (
              <View style={styles.recentsSection}>
                <Text style={styles.recentsTitle}>
                  Recents
                </Text>

                {recents.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.resultCard}
                    onPress={() => {
                      void openPlace(item);
                    }}
                  >
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View
                        style={[
                          styles.thumbnail,
                          styles.thumbnailFallback,
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={26}
                          color={theme.colors.textSecondary}
                        />
                      </View>
                    )}

                    <View style={styles.resultInfo}>
                      <Text style={styles.placeName}>
                        {item.name}
                      </Text>

                      <Text style={styles.meta}>
                        {item.category} · {item.county}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultCard}
              onPress={() => {
                void openPlace(item);
              }}
            >
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View
                  style={[
                    styles.thumbnail,
                    styles.thumbnailFallback,
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={26}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}

              <View style={styles.resultInfo}>
                <Text style={styles.placeName}>
                  {(() => {
                    const search = query.trim();
                    const lowerName = item.name.toLowerCase();
                    const lowerSearch = search.toLowerCase();
                    const index = lowerName.indexOf(lowerSearch);

                    if (!search || index === -1) {
                      return item.name;
                    }

                    return (
                      <>
                        {item.name.slice(0, index)}
                        <Text style={styles.highlightedText}>
                          {item.name.slice(
                            index,
                            index + search.length
                          )}
                        </Text>
                        {item.name.slice(
                          index + search.length
                        )}
                      </>
                    );
                  })()}
                </Text>

                <Text style={styles.meta}>
                  {item.category} · {item.county}
                </Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            !lastPage && results.length > 0 ? (
              <Pressable
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load more
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  searchBox: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: theme.colors.text,
    fontSize: 15,
  },
  results: {
    padding: 16,
    paddingBottom: 90,
  },
  recentsSection: {
    marginBottom: 8,
  },
  recentsTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  resultCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSoft,
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  highlightedText: {
    color: theme.colors.green,
    fontWeight: '900',
  },
  meta: {
    marginTop: 5,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: 10,
    minWidth: 120,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadMoreText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
