import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import RecipeArtwork from './RecipeArtwork';
import { API_BASE_URL } from '../../config/environment';
import { getAvatarColor } from '../../utils/avatarColor';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeApp';

interface RecipeCardProps {
  recipe: Recipe;
  token: string;
  isSaved: boolean;
  compact?: boolean;
  onOpen: (recipe: Recipe) => void;
  onToggleSaved: (recipeId: string) => void;
  onToggleLike: (recipeId: string) => void;
  onAuthorPress?: (userId: string) => void;
}

function RecipeCard({ recipe, token, isSaved, compact = false, onOpen, onToggleSaved, onToggleLike, onAuthorPress }: RecipeCardProps) {
  return (
    <View style={[styles.recipeCard, compact && styles.recipeCardCompact]}>
      <Pressable onPress={() => onOpen(recipe)} style={compact ? styles.recipeArtworkCompact : undefined}>
        <RecipeArtwork recipe={recipe} token={token} compact={compact} />
      </Pressable>
      <View style={[styles.recipeCardBody, compact && styles.recipeCardBodyCompact]}>
        <View style={styles.recipeMetaTop}>
          <Text style={styles.recipeCategory}>{recipe.category}</Text>
          <Pressable
            onPress={() => onToggleSaved(recipe.id)}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? '저장 취소' : '레시피 저장'}
            style={styles.bookmarkButton}>
            <Image
              source={isSaved
                ? require('../../../assets/community/bookmark-filled.png')
                : require('../../../assets/community/bookmark-outline.png')}
              style={styles.bookmarkImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>
        <Pressable onPress={() => onOpen(recipe)}>
          <Text numberOfLines={2} style={styles.recipeCardTitle}>{recipe.title}</Text>
          <Text numberOfLines={1} style={styles.recipeDescription}>{recipe.description}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${recipe.author} 요리 페이지 보기`}
          disabled={!recipe.authorId || !onAuthorPress}
          onPress={() => recipe.authorId && onAuthorPress?.(recipe.authorId)}
          style={styles.recipeCardAuthor}
        >
          {recipe.profileImageFilSeq ? (
            <Image
              source={{
                uri: `${API_BASE_URL}/api/community/files/${recipe.profileImageFilSeq}`,
                headers: { Authorization: `Bearer ${token}` },
              }}
              style={styles.recipeCardAuthorAvatar}
            />
          ) : (
            <View style={[styles.recipeCardAuthorAvatar, { backgroundColor: getAvatarColor(recipe.authorId) }]}>
              <Text style={styles.recipeCardAuthorInitial}>{recipe.authorInitial}</Text>
            </View>
          )}
          <Text numberOfLines={1} style={styles.recipeCardAuthorName}>{recipe.author}</Text>
          <Text style={styles.recipeCardAuthorArrow}>›</Text>
        </Pressable>
        <View style={styles.recipeCardFooter}>
          <Text style={styles.recipeTinyMeta}>◷ {recipe.cookingMinutes}분</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recipe.likedByMe ? '좋아요 취소' : '좋아요'}
            onPress={() => onToggleLike(recipe.id)}
            style={styles.recipeLikeButton}>
            <Text style={[styles.recipeTinyMeta, recipe.likedByMe && styles.recipeLikedMeta]}>
              {recipe.likedByMe ? '♥' : '♡'} {recipe.likeCount ?? recipe.rating}
            </Text>
          </Pressable>
          <Text style={styles.recipeTinyMeta}>댓글 {recipe.commentCount ?? 0}</Text>
          <Text style={styles.recipeTinyMeta}>저장 {recipe.saves}</Text>
        </View>
      </View>
    </View>
  );
}

export default RecipeCard;
