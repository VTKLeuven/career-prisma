import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ExportedBooth } from '../../types/floorplan';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { Search, X } from 'lucide-react-native';

export interface FloorplanHeaderProps {
  booths: ExportedBooth[];
  onSelectSearchResult: (booth: ExportedBooth) => void;
  isOffline?: boolean;
}

export const FloorplanHeader: React.FC<FloorplanHeaderProps> = ({
  booths,
  onSelectSearchResult,
  isOffline = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Filter booths matching query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return booths.filter((b) => {
      const companyName = b.company?.name.toLowerCase() || '';
      const boothNum = String(b.booth_number);
      return companyName.includes(q) || boothNum.includes(q);
    });
  }, [searchQuery, booths]);

  const handleSelect = (booth: ExportedBooth) => {
    setSearchQuery('');
    setIsFocused(false);
    onSelectSearchResult(booth);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>VTK Jobfair 2026</Text>
          <Text style={styles.subtitle}>Interactive Floorplan</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search company or stand (e.g. ASML, 42)..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
        />
        {searchQuery.length > 0 && (
          <Pressable style={styles.clearButton} onPress={() => setSearchQuery('')}>
            <X size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Autocomplete Dropdown List */}
      {isFocused && searchResults.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {searchResults.map((b) => (
              <Pressable
                key={b.id}
                style={styles.dropdownItem}
                onPress={() => handleSelect(b)}
              >
                <View style={styles.boothBadge}>
                  <Text style={styles.boothBadgeText}>Stand {b.booth_number}</Text>
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.companyName}>{b.company?.name || 'Unassigned Stand'}</Text>
                  <Text style={styles.companyDesc} numberOfLines={1}>
                    {b.company?.short_description || 'No description'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.surfaceSecondary,
  },
  offlineBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  offlineText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  dropdown: {
    position: 'absolute',
    top: 110,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    maxHeight: 220,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownScroll: {
    padding: SPACING.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSecondary,
  },
  boothBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.sm,
  },
  boothBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  itemMeta: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  companyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
