import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getCategoryColor } from '../../utils/colors';

export interface CategoryItem {
  id: number | null;
  name: string;
  shortName?: string;
}

export interface CategoryFilterPillsProps {
  categories: CategoryItem[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const CategoryFilterPills: React.FC<CategoryFilterPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {categories.map((cat) => {
        const isActive = selectedCategoryId === cat.id;
        const isAllMasters = cat.id === null;
        const activeColor = getCategoryColor(cat.id);
        
        // For 'All Masters', use a distinct active style instead of standard colors
        const activeStyle = isAllMasters 
          ? styles.pillActiveAllMasters 
          : { backgroundColor: activeColor, borderColor: activeColor };
          
        return (
          <Pressable
            key={cat.name}
            style={[
              styles.pill, 
              isActive && activeStyle
            ]}
            onPress={() => onSelectCategory(cat.id)}
          >
            <Text style={[
              styles.pillText, 
              isActive && styles.pillTextActive,
              (isActive && isAllMasters) && styles.pillTextActiveAllMasters
            ]}>
              {cat.shortName ? `${cat.name} (${cat.shortName})` : cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 40,
    backgroundColor: COLORS.primary,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  pillActiveAllMasters: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.surface,
  },
  pillText: {
    color: COLORS.surfaceSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  pillTextActiveAllMasters: {
    color: COLORS.surface,
  },
});
