import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { RECIPE_CATEGORIES, type RecipeCategory } from '../../types/recipe';
import styles from '../../styles/recipeApp';

function RecipeCategories({
  selected,
  onSelect,
  categories,
  includeAll = true,
  valueKey = 'name',
  allowFallback = true,
}: {
  selected: string;
  onSelect: (category: string) => void;
  categories?: RecipeCategory[];
  includeAll?: boolean;
  valueKey?: 'code' | 'name';
  allowFallback?: boolean;
}) {
  const options = categories?.length
    ? [
        ...(includeAll ? [{ code: '', name: '전체' }] : []),
        ...categories.map(item => ({ code: item.code, name: item.name })),
      ]
    : !allowFallback
      ? []
      : (includeAll ? RECIPE_CATEGORIES : RECIPE_CATEGORIES.filter(item => item !== '전체')).map(name => ({ code: '', name }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
      {options.map(category => {
        const value = valueKey === 'code' ? category.code : category.name;
        const isSelected = selected === value;

        return (
          <Pressable
            key={`${category.code}:${category.name}`}
            onPress={() => onSelect(value)}
            style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
            <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default RecipeCategories;
