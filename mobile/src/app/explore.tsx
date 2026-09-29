import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomNav } from '@/components/bottom-nav';
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
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const value = query.trim();

    if (!value) {
      setResults([]);
      setSearched(false);
      return;
    }

    try {
      setSearching(true);

      const data = await searchPlaces(
        value,
        0,
        PAGE_SIZE
      );

      setResults(data.content);
      setPage(data.page);
      setLastPage(data.last);
      setSearched(true);
    } catch (error) {
      console.log('Search failed:', error);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
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
        <Text style={styles.title}>
          Search places
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.textSecondary}
            />

            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder="Search by keyword"
              placeholderTextColor={
                theme.colors.textSecondary
              }
              returnKeyType="search"
              style={styles.input}
            />
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator />
            ) : (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.white}
              />
            )}
          </Pressable>
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
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultCard}
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: item.id },
                })
              }
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
                    name="image-outline"
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

      <BottomNav />
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: theme.colors.text,
    fontSize: 15,
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.green,
  },
  results: {
    padding: 16,
    paddingBottom: 90,
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
