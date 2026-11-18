import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import type { CommunityRelationType, CommunityUserProfile } from '../../api/communityApi';
import RecipeCard from '../../components/recipes/RecipeCard';
import RecipeEmptyState from '../../components/recipes/RecipeEmptyState';
import RecipeHeader from '../../components/recipes/RecipeHeader';
import { API_BASE_URL } from '../../config/environment';
import { getAvatarColor } from '../../utils/avatarColor';
import type { Recipe } from '../../types/recipe';
import styles from '../../styles/recipeUser';

interface RecipeUserScreenProps {
  profile: CommunityUserProfile | null;
  recipes: Recipe[];
  token: string;
  loading: boolean;
  isOwn: boolean;
  savedIds: string[];
  savedCount?: number;
  loadError?: string;
  ownTitle?: string;
  onBack?: () => void;
  onToggleFollow: () => void;
  onRelationPress?: (type: CommunityRelationType) => void;
  onWrite?: () => void;
  onLogout?: () => void;
  onRetry?: () => void;
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
  savedCount,
  loadError,
  ownTitle,
  onBack,
  onToggleFollow,
  onRelationPress,
  onWrite,
  onLogout,
  onRetry,
  onOpenRecipe,
  onToggleSaved,
  onToggleLike,
  onAuthorPress,
}: RecipeUserScreenProps) {
  return (
    <View style={styles.container}>
      <RecipeHeader
        title={isOwn ? ownTitle : profile?.usrNm || '요리 페이지'}
        onBack={onBack}
        right={isOwn && onLogout ? (
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        ) : undefined}
      />
      {profile ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          {onWrite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="레시피 작성"
              onPress={onWrite}
              style={styles.writeIconButton}
            >
              <Text style={styles.writeIcon}>＋</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.stats}>
          <Stat value={profile.postCount} label="레시피" />
          <Stat
            value={profile.followerCount}
            label="팔로워"
            onPress={isOwn && onRelationPress ? () => onRelationPress('followers') : undefined}
          />
          <Stat
            value={profile.followingCount}
            label="팔로잉"
            onPress={isOwn && onRelationPress ? () => onRelationPress('following') : undefined}
          />
          {isOwn && savedCount !== undefined ? <Stat value={savedCount} label="저장" /> : null}
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
          <View style={styles.sectionActions}>
            <Text style={styles.sectionCaption}>{isOwn ? '내가 만든 레시피를 모았어요.' : '이 사용자가 공유한 레시피를 모았어요.'}</Text>
            {onWrite ? (
              <Pressable onPress={onWrite} style={styles.writeButton}>
                <Text style={styles.writeButtonText}>＋ 작성</Text>
              </Pressable>
            ) : null}
          </View>
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
      </ScrollView> : loading ? (
        <View style={styles.loadingContent} />
      ) : (
        <View style={styles.loadErrorContainer}>
          <Text style={styles.loadError}>{loadError || '프로필을 불러오지 못했습니다.'}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}명 보기`} onPress={onPress} style={styles.stat}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.stat}>{content}</View>
  );
}

export default RecipeUserScreen;
