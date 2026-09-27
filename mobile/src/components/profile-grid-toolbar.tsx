import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '@/theme';

export type SortField = 'name' | 'date';
export type SortDirection = 'asc' | 'desc';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
};

export function ProfileGridToolbar({
  search,
  onSearchChange,
  sortField,
  sortDirection,
  onSortChange,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);

  function handleSort(field: SortField) {
    const nextDirection =
      sortField === field
        ? sortDirection === 'asc'
          ? 'desc'
          : 'asc'
        : field === 'name'
          ? 'asc'
          : 'desc';

    onSortChange(field, nextDirection);
    setSortOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.searchArea}>
          <View style={styles.searchRow}>
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.textSecondary}
            />

            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Search"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.input}
            />
          </View>

          <View style={styles.searchLine} />
        </View>

        <View>
          <Pressable
            style={styles.sortButton}
            onPress={() => setSortOpen((current) => !current)}
          >
            <Ionicons
              name="filter-outline"
              size={20}
              color={theme.colors.text}
            />
          </Pressable>

          {sortOpen && (
            <View style={styles.menu}>
              <Pressable
                style={styles.menuItem}
                onPress={() => handleSort('name')}
              >
                <Text style={styles.menuText}>Name</Text>

                {sortField === 'name' && (
                  <Ionicons
                    name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={theme.colors.accent}
                  />
                )}
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => handleSort('date')}
              >
                <Text style={styles.menuText}>Date</Text>

                {sortField === 'date' && (
                  <Ionicons
                    name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={theme.colors.accent}
                  />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchArea: {
    flex: 1,
  },
  searchRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchLine: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  sortButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 42,
    width: 130,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 30,
  },
  menuItem: {
    height: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
