import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, Text, View } from 'react-native';

import CommunityCommentsModal from '../../components/community/CommunityCommentsModal';
import RecipeArtwork from '../../components/recipes/RecipeArtwork';
import RecipeHeader from '../../components/recipes/RecipeHeader';
import RecipeSaveButton from '../../components/recipes/RecipeSaveButton';
import { API_BASE_URL } from '../../config/environment';
import { getAvatarColor } from '../../utils/avatarColor';
import type { CommunityPost } from '../../api/communityApi';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeApp';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  token: string;
  saved: boolean;
  liked: boolean;
  currentUserId: string;
  onBack: () => void;
  onToggleSaved: () => void;
  onToggleLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCommentCountChange: (delta: number) => void;
  onAuthorPress: (userId: string) => void;
}

function RecipeDetailScreen({
  recipe,
  token,
  saved,
  liked,
  currentUserId,
  onBack,
  onToggleSaved,
  onToggleLike,
  onEdit,
  onDelete,
  onCommentCountChange,
  onAuthorPress,
}: RecipeDetailScreenProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(14)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentsPost = useMemo<CommunityPost | null>(() => {
    const postSeq = recipe.postSeq ?? Number(recipe.id);
    if (!Number.isFinite(postSeq) || postSeq <= 0) return null;
    return {
      postSeq,
      authorId: recipe.authorId ?? '',
      authorName: recipe.author,
      profileImageFilSeq: recipe.profileImageFilSeq ?? null,
      content: recipe.description,
      createdAt: recipe.createdAt ?? '',
      likeCount: recipe.likeCount ?? 0,
      commentCount: recipe.commentCount ?? 0,
      likedByMe: liked,
      savedByMe: saved,
      media: [],
    };
  }, [liked, recipe, saved]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
    toastOpacity.setValue(0);
    toastTranslateY.setValue(14);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 10, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setToastMessage('');
      });
    }, 2100);
  }, [toastOpacity, toastTranslateY]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
  }, [toastOpacity, toastTranslateY]);

  const onCommentAdded = (postSeq: number) => {
    if (postSeq === commentsPost?.postSeq) onCommentCountChange(1);
  };
  const onCommentDeleted = (postSeq: number) => {
    if (postSeq === commentsPost?.postSeq) onCommentCountChange(-1);
  };

  return (
    <View style={styles.container}>
      <RecipeHeader title="레시피" onBack={onBack} right={<RecipeSaveButton saved={saved} onPress={onToggleSaved} large />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
        <RecipeArtwork recipe={recipe} token={token} large />
        <View style={styles.detailTitleBlock}>
          <View style={styles.detailCategoryPill}><Text style={styles.detailCategoryText}>{recipe.category}</Text></View>
          <Text style={styles.detailTitle}>{recipe.title}</Text>
          <Text style={styles.detailDescription}>{recipe.description}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${recipe.author} 요리 페이지 보기`}
            disabled={!recipe.authorId}
            onPress={() => recipe.authorId && onAuthorPress(recipe.authorId)}
            style={styles.authorRow}
          >
            {recipe.profileImageFilSeq ? (
              <Image
                source={{
                  uri: `${API_BASE_URL}/api/community/files/${recipe.profileImageFilSeq}`,
                  headers: { Authorization: `Bearer ${token}` },
                }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={[styles.authorAvatar, { backgroundColor: getAvatarColor(recipe.authorId) }]}>
                <Text style={styles.authorAvatarText}>{recipe.authorInitial}</Text>
              </View>
            )}
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>{recipe.author}</Text>
              <Text style={styles.authorCaption}>{recipe.createdAt ? `${recipe.createdAt.slice(0, 10)} · 한끼모아 레시피` : '한끼모아 레시피'}</Text>
            </View>
            <Text style={styles.recipeCardAuthorArrow}>›</Text>
          </Pressable>
          {recipe.isMine && (
            <View style={styles.recipeOwnerActions}>
              <Pressable accessibilityRole="button" onPress={onEdit} style={styles.recipeOwnerAction}>
                <Text style={styles.recipeOwnerActionText}>수정</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onDelete} style={[styles.recipeOwnerAction, styles.recipeOwnerDelete]}>
                <Text style={[styles.recipeOwnerActionText, styles.recipeOwnerDeleteText]}>삭제</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.recipeReactionRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={liked ? '좋아요 취소' : '좋아요'} onPress={onToggleLike} style={styles.recipeReactionAction}>
              <Text style={[styles.recipeReactionGlyph, liked && styles.recipeReactionLiked]}>{liked ? '♥' : '♡'}</Text>
              <Text style={styles.recipeReactionText}>{recipe.likeCount ?? 0}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="댓글 보기" onPress={() => setCommentsOpen(true)} style={styles.recipeReactionAction}>
              <Text style={styles.recipeReactionGlyph}>▱</Text>
              <Text style={styles.recipeReactionText}>댓글 {recipe.commentCount ?? 0}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.detailQuickFacts}>
          <QuickFact icon="◷" value={`${recipe.cookingMinutes}분`} label="조리 시간" />
          <QuickFact icon="♨" value={recipe.difficulty || '보통'} label="난이도" />
          <QuickFact icon="♡" value={String(recipe.servings ?? 0)} label="인분" />
        </View>
        <View style={styles.detailSection}>
          <View style={styles.detailSectionHeading}>
            <Text style={styles.detailSectionTitle}>재료</Text>
            <Text style={styles.ingredientCount}>{recipe.ingredients.length}가지</Text>
          </View>
          {recipe.ingredients.map((ingredient, index) => (
            <IngredientRow key={`${recipe.id}-ingredient-${index}`} ingredient={ingredient} />
          ))}
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>만드는 순서</Text>
          {recipe.steps.map((step, index) => <StepRow key={`${recipe.id}-step-${index}`} number={index + 1} step={step} />)}
        </View>
        <View style={styles.detailEndNote}><Text style={styles.detailEndEmoji}>🥣</Text><Text style={styles.detailEndText}>맛있게 드세요!</Text></View>
      </ScrollView>
      <CommunityCommentsModal
        post={commentsOpen ? commentsPost : null}
        token={token}
        currentUserId={currentUserId}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={onCommentAdded}
        onCommentDeleted={onCommentDeleted}
        onToast={showToast}
        onAuthorPress={userId => {
          setCommentsOpen(false);
          onAuthorPress(userId);
        }}
        toastMessage={toastMessage}
        toastOpacity={toastOpacity}
        toastTranslateY={toastTranslateY}
      />
    </View>
  );
}

function QuickFact({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <View style={styles.quickFact}><Text style={styles.quickFactIcon}>{icon}</Text><Text style={styles.quickFactValue}>{value}</Text><Text style={styles.quickFactLabel}>{label}</Text></View>;
}

function IngredientRow({ ingredient }: { ingredient: string }) {
  const [checked, setChecked] = React.useState(false);
  return (
    <Pressable onPress={() => setChecked(value => !value)} style={styles.ingredientRow}>
      <View style={[styles.ingredientCheck, checked && styles.ingredientCheckActive]}><Text style={styles.ingredientCheckMark}>{checked ? '✓' : ''}</Text></View>
      <Text style={[styles.ingredientText, checked && styles.ingredientTextChecked]}>{ingredient}</Text>
      <Text style={styles.ingredientAction}>{checked ? '준비 완료' : '체크'}</Text>
    </Pressable>
  );
}

function StepRow({ number, step }: { number: number; step: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <Text style={styles.stepText}>{step}</Text>
    </View>
  );
}

export default RecipeDetailScreen;
