import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import RecipeCard from '../../components/recipes/RecipeCard';
import RecipeEmptyState from '../../components/recipes/RecipeEmptyState';
import RecipeHeader from '../../components/recipes/RecipeHeader';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeApp';

interface RecipeSavedScreenProps {
  recipes: Recipe[];
  isLoading: boolean;
  token: string;
  savedIds: string[];
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleSaved: (id: string) => void;
  onToggleLike: (id: string) => void;
  onAuthorPress: (userId: string) => void;
}

function RecipeSavedScreen({ recipes, isLoading, token, savedIds, onOpenRecipe, onToggleSaved, onToggleLike, onAuthorPress }: RecipeSavedScreenProps) {
  return (
    <>
      <RecipeHeader title="저장한 레시피" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeadingRow}>
          <View>
            <Text style={styles.pageTitle}>나중에 만들 요리</Text>
            <Text style={styles.pageSubtitle}>마음에 든 레시피를 한곳에 모았어요.</Text>
          </View>
          <View style={styles.countPill}><Text style={styles.countPillText}>{isLoading ? '—' : recipes.length}</Text></View>
        </View>
        {recipes.length ? recipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            token={token}
            isSaved={savedIds.includes(recipe.id)}
            onOpen={onOpenRecipe}
            onToggleSaved={onToggleSaved}
            onToggleLike={onToggleLike}
            onAuthorPress={onAuthorPress}
          />
        )) : !isLoading ? <RecipeEmptyState /> : null}
      </ScrollView>
    </>
  );
}

export default RecipeSavedScreen;
