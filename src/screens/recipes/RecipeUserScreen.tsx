import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import type { CommunityUserProfile } from '../../api/communityApi';
import RecipeCard from '../../components/recipes/RecipeCard';
import RecipeEmptyState from '../../components/recipes/RecipeEmptyState';
import RecipeHeader from '../../components/recipes/RecipeHeader';
import { API_BASE_URL } from '../../config/environment';
import { getAvatarColor } from '../../utils/avatarColor';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeUser';

interface RecipeUserScreenProps {
  profile: CommunityUserProfile;
  recipes: Recipe[];
  token: string;
  loading: boolean;
  isOwn: boolean;
  savedIds: string[];
  onBack: () => void;
  onToggleFollow: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleSaved: (recipeId: string) => void;
  onToggleLike: (recipeId: string) => void;
  onAuthorPress: (userId: string) => void;
}

function RecipeUserScreen({
  profile,
  recipes,
  token,
  loading,
  isOwn,
  savedIds,
  onBack,
  onToggleFollow,
  onOpenRecipe,
  onToggleSaved,
  onToggleLike,
  onAuthorPress,
}: RecipeUserScreenProps) {
  return (
    <View style={styles.container}>
      <RecipeHeader title={profile.usrNm || '요리 페이지'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          {profile.profileImageFilSeq ? (
            <Image
              source={{
                uri: `${API_BASE_URL}/api/community/files/${profile.profileImageFilSeq}`,
                headers: { Authorization: `Bearer ${token}` },
              }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(profile.usrId) }]}>
              <Text style={styles.avatarInitial}>{profile.usrNm?.slice(0, 1) || '?'}</Text>
            </View>
          )}
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.nickname}>{profile.usrNm || '한끼모아 사용자'}</Text>
            <Text numberOfLines={1} style={styles.username}>@{profile.userName || profile.usrId}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={profile.postCount} label="레시피" />
          <Stat value={profile.followerCount} label="팔로워" />
          <Stat value={profile.followingCount} label="팔로잉" />
        </View>

        {!isOwn && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profile.following ? '팔로우 취소' : '팔로우'}
            onPress={onToggleFollow}
            style={[styles.followButton, profile.following && styles.followingButton]}
          >
            <Text style={[styles.followText, profile.following && styles.followingText]}>
              {profile.following ? '팔로잉' : '팔로우'}
            </Text>
          </Pressable>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>요리한 레시피</Text>
          <Text style={styles.sectionCaption}>이 사용자가 공유한 레시피를 모았어요.</Text>
        </View>
        {!loading && recipes.length === 0 ? (
          <RecipeEmptyState title="아직 공개된 레시피가 없어요" description="새 레시피를 공유하면 이곳에 표시됩니다." />
        ) : recipes.map(recipe => (
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
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default RecipeUserScreen;
