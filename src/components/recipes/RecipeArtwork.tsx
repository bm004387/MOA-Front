import React from 'react';
import { Image, Text, View } from 'react-native';

import { API_BASE_URL } from '../../config/environment';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeApp';

function RecipeArtwork({ recipe, token, large = false, compact = false }: { recipe: Recipe; token: string; large?: boolean; compact?: boolean }) {
  const photoUri = recipe.finishedPhotoUri
    || (recipe.finishedPhotoFilSeq ? `${API_BASE_URL}/api/community/files/${recipe.finishedPhotoFilSeq}` : null);

  return (
    <View style={[styles.artwork, large ? styles.artworkLarge : compact ? styles.artworkCompact : styles.artworkCard, { backgroundColor: recipe.artwork }]}>
      {photoUri && token ? (
        <Image
          source={recipe.finishedPhotoUri
            ? { uri: recipe.finishedPhotoUri }
            : { uri: photoUri, headers: { Authorization: `Bearer ${token}` } }}
          style={styles.artworkPhoto}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.plateOuter, large && styles.plateOuterLarge]}>
          <View style={[styles.plateInner, large && styles.plateInnerLarge]}>
            <Text style={[styles.foodEmoji, large && styles.foodEmojiLarge]}>{recipe.emoji}</Text>
          </View>
        </View>
      )}
      {large && (
        <View style={styles.artworkSparkle}>
          <Text style={styles.sparkleText}>오늘의 한 끼</Text>
        </View>
      )}
    </View>
  );
}

export default RecipeArtwork;
