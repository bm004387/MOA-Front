import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Text, View } from 'react-native';

import BrandLoader from '../components/common/BrandLoader';
import { getCommonCodeGroupList, getCommonCodeList, type CommonCodeGroupItem, type CommonCodeItem } from '../api/commonCodeApi';
import {
  createRecipe,
  deleteRecipe as deleteRecipeApi,
  getRecipe,
  getRecipeIngredientUnitMappings,
  getRecipes,
  setRecipeLiked,
  setRecipeSaved,
  updateRecipe as updateRecipeApi,
  type RecipeIngredientUnitMapping,
  type RecipeResponse,
} from '../api/recipeApi';
import { logout } from '../api/authApi';
import {
  getCommunityUserProfile,
  removeCommunityFollower,
  setCommunityFollow,
  type CommunityRelationType,
  type CommunityUserProfile,
} from '../api/communityApi';
import { clearAuthCredentials, getAuthCredentials } from '../storage/tokenStorage';
import useMsg from '../hooks/useMsg';
import RecipeCreateScreen from './recipes/RecipeCreateScreen';
import RecipeDetailScreen from './recipes/RecipeDetailScreen';
import RecipeHomeScreen from './recipes/RecipeHomeScreen';
import RecipeHeader from '../components/recipes/RecipeHeader';
import CommunityFollowListScreen from './CommunityFollowListScreen';
import RecipeSavedScreen from './recipes/RecipeSavedScreen';
import RecipeSearchScreen from './recipes/RecipeSearchScreen';
import RecipeUserScreen from './recipes/RecipeUserScreen';
import type { Recipe, RecipeCategory, RecipeDraft, RecipeTab } from '../types/recipe';
import styles from '../styles/recipeApp';

interface RecipeAppScreenProps {
  activeTab: RecipeTab;
  onLogout: () => void;
  menuName?: string;
}

type Page = 'tab' | 'detail' | 'write' | 'edit' | 'profile' | 'follows';
interface PageSnapshot {
  page: Page;
  selectedRecipeId: string;
  detailRecipe: Recipe | null;
  profileUser: CommunityUserProfile | null;
  profileRecipes: Recipe[];
}

function RecipeAppScreen({ activeTab, onLogout, menuName }: RecipeAppScreenProps) {
  const { getMsg } = useMsg();
  const getMsgRef = useRef(getMsg);
  getMsgRef.current = getMsg;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [accessToken, setAccessToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loadedQueryKey, setLoadedQueryKey] = useState('');
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [difficulties, setDifficulties] = useState<RecipeCategory[]>([]);
  const [commonCodes, setCommonCodes] = useState<CommonCodeItem[]>([]);
  const [commonCodeGroups, setCommonCodeGroups] = useState<CommonCodeGroupItem[]>([]);
  const [commonCodesLoading, setCommonCodesLoading] = useState(true);
  const [ingredientUnitMappings, setIngredientUnitMappings] = useState<RecipeIngredientUnitMapping[]>([]);
  const [ingredientUnitMappingsLoading, setIngredientUnitMappingsLoading] = useState(true);
  const [ingredientUnitMappingsError, setIngredientUnitMappingsError] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [page, setPage] = useState<Page>('tab');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [profileUser, setProfileUser] = useState<CommunityUserProfile | null>(null);
  const [profileRecipes, setProfileRecipes] = useState<Recipe[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [myProfile, setMyProfile] = useState<CommunityUserProfile | null>(null);
  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [myProfileError, setMyProfileError] = useState('');
  const [followRelationType, setFollowRelationType] = useState<CommunityRelationType>('followers');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabRefreshing, setTabRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const recipeRequestId = useRef(0);
  const tabRefreshInFlight = useRef(false);
  const detailRequestId = useRef(0);
  const profileRequestId = useRef(0);
  const myProfileRequestId = useRef(0);
  const navigationStack = useRef<PageSnapshot[]>([]);
  const likeRequests = useRef(new Set<string>());
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(8)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedRecipe = detailRecipe ?? recipes.find(recipe => recipe.id === selectedRecipeId);
  const selectedCategoryCode = categories.find(category => category.name === selectedCategory)?.code;
  const queryScope = activeTab === 'myRecipes' ? 'mine' : activeTab === 'saved' ? 'saved' : 'all';
  const supportsRecipeFilters = activeTab === 'home' || activeTab === 'search';
  const queryText = supportsRecipeFilters ? searchText.trim() : '';
  const queryCategoryCode = supportsRecipeFilters ? selectedCategoryCode : undefined;
  const queryKey = JSON.stringify({ scope: queryScope, query: queryText, categoryCode: queryCategoryCode });
  const isQueryLoading = loadedQueryKey !== queryKey;
  const currentRecipes = loadedQueryKey === queryKey ? recipes : [];
  const savedIds = useMemo(() => currentRecipes.filter(recipe => recipe.savedByMe).map(recipe => recipe.id), [currentRecipes]);

  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
  }, [toastOpacity, toastTranslateY]);

  const showToast = (message: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
    toastOpacity.setValue(0);
    toastTranslateY.setValue(8);
    setToastMessage(message);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    toastTimeout.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 8, duration: 250, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setToastMessage('');
        toastTimeout.current = null;
      });
    }, 1750);
  };

  const updateProfileUnderDetail = (recipeId: string, update: (recipe: Recipe) => Recipe) => {
    navigationStack.current = navigationStack.current.map(snapshot => ({
      ...snapshot,
      profileRecipes: snapshot.profileRecipes.map(recipe => recipe.id === recipeId ? update(recipe) : recipe),
    }));
  };

  const saveCurrentScreen = (pageOverride?: Page) => {
    navigationStack.current.push({
      page: pageOverride ?? page,
      selectedRecipeId,
      detailRecipe,
      profileUser,
      profileRecipes,
    });
  };

  const returnToPreviousScreen = () => {
    const previous = navigationStack.current.pop();
    setProfileLoading(false);
    if (!previous) {
      setPage('tab');
      return;
    }
    setSelectedRecipeId(previous.selectedRecipeId);
    setDetailRecipe(previous.detailRecipe);
    setProfileUser(previous.profileUser);
    setProfileRecipes(previous.profileRecipes);
    setPage(previous.page);
  };

  useEffect(() => {
    let mounted = true;
    getAuthCredentials()
      .then(credentials => {
        if (mounted) {
          setAccessToken(credentials ? credentials.password : '');
          setCurrentUserId(credentials ? credentials.username : '');
        }
      })
      .catch(error => console.warn('레시피 사진 인증 정보를 읽지 못했습니다.', error));
    return () => { mounted = false; };
  }, []);

  const loadMyProfile = useCallback(async () => {
    if (!accessToken || !currentUserId) return;
    const requestId = ++myProfileRequestId.current;
    setMyProfileLoading(true);
    setMyProfileError('');
    try {
      const profile = await getCommunityUserProfile(accessToken, currentUserId);
      if (requestId === myProfileRequestId.current) setMyProfile(profile);
    } catch (error) {
      if (requestId === myProfileRequestId.current) {
        setMyProfileError(error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
      }
    } finally {
      if (requestId === myProfileRequestId.current) setMyProfileLoading(false);
    }
  }, [accessToken, currentUserId]);

  useEffect(() => {
    if (activeTab !== 'myRecipes' || !accessToken || !currentUserId) return undefined;
    void loadMyProfile();
    return () => {
      myProfileRequestId.current += 1;
      setMyProfileLoading(false);
    };
  }, [activeTab, accessToken, currentUserId, loadMyProfile]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getCommonCodeList(), getCommonCodeGroupList()])
      .then(([codes, groups]) => {
        if (!mounted) return;
        setCommonCodes(codes);
        setCommonCodeGroups(groups);
        setCategories(codes
          .filter(item => item.comCd.trim().toUpperCase() === 'RCP_CTG')
          .map(item => ({ code: item.comDtlCd, name: item.comDtlDesc || item.comDtlNm })));
        setDifficulties(codes
          .filter(item => item.comCd.trim().toUpperCase() === 'RCP_DIF')
          .map(item => ({ code: item.comDtlCd, name: item.comDtlDesc || item.comDtlNm })));
      })
      .catch(error => {
        if (mounted) console.warn('레시피 분류 공통코드 조회 실패', error);
      })
      .finally(() => {
        if (mounted) setCommonCodesLoading(false);
      });
    getRecipeIngredientUnitMappings()
      .then(mappings => {
        if (mounted) setIngredientUnitMappings(mappings);
      })
      .catch(error => {
        if (!mounted) return;
        setIngredientUnitMappingsError(true);
        console.warn('재료별 계량 단위 연결 조회 실패', error);
      })
      .finally(() => {
        if (mounted) setIngredientUnitMappingsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const refreshRecipes = useCallback(async () => {
    const requestId = ++recipeRequestId.current;
    const result = await getRecipes({
      scope: queryScope,
      query: queryText,
      categoryCode: queryCategoryCode,
      limit: 50,
    });
    if (requestId !== recipeRequestId.current) return;
    setRecipes(result.recipes.map(toRecipe));
    setLoadedQueryKey(queryKey);
    if (queryScope === 'mine' && result.savedCount != null) {
      setSavedCount(result.savedCount);
    }
  }, [queryCategoryCode, queryKey, queryScope, queryText]);

  const refreshCurrentTab = useCallback(() => {
    if (tabRefreshInFlight.current) return;
    tabRefreshInFlight.current = true;
    setTabRefreshing(true);
    void refreshRecipes()
      .catch(error => {
        Alert.alert('레시피', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
      })
      .finally(() => {
        tabRefreshInFlight.current = false;
        setTabRefreshing(false);
      });
  }, [refreshRecipes]);

  useEffect(() => {
    if (page !== 'tab') return undefined;
    let active = true;
    const timer = setTimeout(() => setLoading(true), 500);
    const debounceMs = queryText.length > 0 ? 250 : 0;
    const debounce = setTimeout(() => {
      void refreshRecipes()
        .catch(error => {
          if (active) Alert.alert('레시피', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
        })
        .finally(() => {
          clearTimeout(timer);
          if (active) setLoading(false);
        });
    }, debounceMs);
    return () => {
      active = false;
      recipeRequestId.current += 1;
      clearTimeout(timer);
      clearTimeout(debounce);
      setLoading(false);
    };
  }, [page, refreshRecipes]);

  useEffect(() => {
    setPage('tab');
    setSelectedRecipeId('');
    setDetailRecipe(null);
    setProfileUser(null);
    setProfileRecipes([]);
    navigationStack.current = [];
    setSearchText('');
    setSelectedCategory('전체');
  }, [activeTab]);

  const openUserProfile = async (userId: string) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId || !accessToken) return;
    if (activeTab === 'myRecipes' && page === 'tab' && normalizedUserId === currentUserId) return;
    if (page === 'profile' && profileUser?.usrId === normalizedUserId) return;
    saveCurrentScreen();
    const requestId = ++profileRequestId.current;
    setProfileUser(null);
    setProfileRecipes([]);
    setProfileLoading(true);
    setPage('profile');

    try {
      const [profile, result] = await Promise.all([
        getCommunityUserProfile(accessToken, normalizedUserId),
        getRecipes(normalizedUserId === currentUserId
          ? { scope: 'mine', limit: 50 }
          : { scope: 'all', authorId: normalizedUserId, limit: 50 }),
      ]);
      if (requestId !== profileRequestId.current) return;
      setProfileUser(profile);
      setProfileRecipes(result.recipes.map(toRecipe));
    } catch (error) {
      if (requestId === profileRequestId.current) {
        Alert.alert('요리 페이지', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
        returnToPreviousScreen();
      }
    } finally {
      if (requestId === profileRequestId.current) setProfileLoading(false);
    }
  };

  const returnFromUserProfile = returnToPreviousScreen;

  const toggleProfileFollow = async () => {
    if (!profileUser) return;
    const previous = profileUser;
    const enabled = !previous.following;
    setProfileUser({
      ...previous,
      following: enabled,
      followerCount: Math.max(0, previous.followerCount + (enabled ? 1 : -1)),
    });
    try {
      await setCommunityFollow(accessToken, previous.usrId, enabled);
    } catch (error) {
      setProfileUser(previous);
      Alert.alert('팔로우', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
    }
  };

  const openFollowList = (relationType: CommunityRelationType) => {
    setFollowRelationType(relationType);
    saveCurrentScreen();
    setPage('follows');
  };

  const refreshMyProfileCounts = async () => {
    if (!accessToken || !currentUserId) return;
    try {
      const updatedProfile = await getCommunityUserProfile(accessToken, currentUserId);
      setMyProfile(updatedProfile);
      setProfileUser(current => current?.usrId === currentUserId ? updatedProfile : current);
      navigationStack.current = navigationStack.current.map(snapshot =>
        snapshot.profileUser?.usrId === currentUserId
          ? { ...snapshot, profileUser: updatedProfile }
          : snapshot,
      );
    } catch (error) {
      Alert.alert('팔로우', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
    }
  };

  const toggleFollowFromList = async (userId: string, currentlyFollowing: boolean) => {
    try {
      const enabled = !currentlyFollowing;
      await setCommunityFollow(accessToken, userId, enabled);
      showToast(getMsgRef.current('COMMUNITY', enabled ? '003' : '004'));
      return true;
    } catch (error) {
      Alert.alert('팔로우', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
      return false;
    }
  };

  const removeFollowerFromList = async (userId: string) => {
    try {
      const result = await removeCommunityFollower(accessToken, userId);
      return result.success;
    } catch (error) {
      Alert.alert('팔로워', error instanceof Error ? error.message : getMsgRef.current('COMMON', '023'));
      return false;
    }
  };

  const openRecipe = async (recipe: Recipe) => {
    const requestId = ++detailRequestId.current;
    saveCurrentScreen();
    setSelectedRecipeId(recipe.id);
    setDetailRecipe(recipe);
    setPage('detail');
    if (!recipe.postSeq) return;
    const timer = setTimeout(() => setLoading(true), 500);
    try {
      const row = await getRecipe(recipe.postSeq);
      if (requestId === detailRequestId.current) setDetailRecipe(toRecipe(row));
    } catch (error) {
      if (requestId === detailRequestId.current) {
        Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
      }
    } finally {
      clearTimeout(timer);
      if (requestId === detailRequestId.current) setLoading(false);
    }
  };

  const returnFromRecipeDetail = returnToPreviousScreen;

  const toggleSaved = async (recipeId: string) => {
    const target = recipes.find(recipe => recipe.id === recipeId)
      ?? profileRecipes.find(recipe => recipe.id === recipeId)
      ?? detailRecipe;
    if (!target?.postSeq) return;
    const enabled = !target.savedByMe;
    try {
      await setRecipeSaved(target.postSeq, enabled);
      setRecipes(current => current.map(recipe => recipe.id === recipeId
        ? { ...recipe, savedByMe: enabled, saves: Math.max(0, recipe.saves + (enabled ? 1 : -1)) }
        : recipe));
      setProfileRecipes(current => current.map(recipe => recipe.id === recipeId
        ? { ...recipe, savedByMe: enabled, saves: Math.max(0, recipe.saves + (enabled ? 1 : -1)) }
        : recipe));
      updateProfileUnderDetail(recipeId, recipe => ({
        ...recipe,
        savedByMe: enabled,
        saves: Math.max(0, recipe.saves + (enabled ? 1 : -1)),
      }));
      setDetailRecipe(current => current?.id === recipeId
        ? { ...current, savedByMe: enabled, saves: Math.max(0, current.saves + (enabled ? 1 : -1)) }
        : current);
      if (queryScope === 'saved' && !enabled) {
        setRecipes(current => current.filter(recipe => recipe.id !== recipeId));
      }
      if (queryScope === 'mine') {
        setSavedCount(current => Math.max(0, current + (enabled ? 1 : -1)));
      }
    } catch (error) {
      Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
    }
  };

  const toggleLiked = async (recipeId: string) => {
    if (likeRequests.current.has(recipeId)) return;
    const target = recipes.find(recipe => recipe.id === recipeId)
      ?? profileRecipes.find(recipe => recipe.id === recipeId)
      ?? detailRecipe;
    if (!target?.postSeq) return;

    const enabled = !target.likedByMe;
    likeRequests.current.add(recipeId);
    const updateLikeState = (current: Recipe | null): Recipe | null => current?.id === recipeId
      ? {
        ...current,
        likedByMe: enabled,
        likeCount: Math.max(0, (current.likeCount ?? Number(current.rating) ?? 0) + (enabled ? 1 : -1)),
        rating: String(Math.max(0, (current.likeCount ?? Number(current.rating) ?? 0) + (enabled ? 1 : -1))),
      }
      : current;
    setRecipes(current => current.map(recipe => updateLikeState(recipe) ?? recipe));
    setProfileRecipes(current => current.map(recipe => updateLikeState(recipe) ?? recipe));
    updateProfileUnderDetail(recipeId, recipe => updateLikeState(recipe) ?? recipe);
    setDetailRecipe(current => updateLikeState(current));

    try {
      await setRecipeLiked(target.postSeq, enabled);
    } catch (error) {
      setRecipes(current => current.map(recipe => recipe.id === recipeId
        ? { ...recipe, likedByMe: !enabled, likeCount: target.likeCount ?? 0, rating: String(target.likeCount ?? 0) }
        : recipe));
      setProfileRecipes(current => current.map(recipe => recipe.id === recipeId
        ? { ...recipe, likedByMe: !enabled, likeCount: target.likeCount ?? 0, rating: String(target.likeCount ?? 0) }
        : recipe));
      updateProfileUnderDetail(recipeId, recipe => ({
        ...recipe,
        likedByMe: !enabled,
        likeCount: target.likeCount ?? 0,
        rating: String(target.likeCount ?? 0),
      }));
      setDetailRecipe(current => current?.id === recipeId
        ? { ...current, likedByMe: !enabled, likeCount: target.likeCount ?? 0, rating: String(target.likeCount ?? 0) }
        : current);
      Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
    } finally {
      likeRequests.current.delete(recipeId);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', getMsg('AUTH', '004'), [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: processLogout },
    ]);
  };

  const processLogout = async () => {
    setLoggingOut(true);
    try {
      const credentials = await getAuthCredentials();
      if (credentials) await logout(credentials.password);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      setLoggingOut(false);
      await clearAuthCredentials();
      Alert.alert('로그아웃', getMsg('AUTH', '005'), [{ text: '확인', onPress: onLogout }]);
    }
  };

  const addRecipe = async (draft: RecipeDraft) => {
    const timer = setTimeout(() => setLoading(true), 500);
    try {
      const postSeq = await createRecipe(draft);
      const fallbackRecipe = toDraftRecipe(draft, postSeq);
      setMyProfile(current => current ? { ...current, postCount: current.postCount + 1 } : current);
      setProfileUser(current => current?.usrId === currentUserId
        ? { ...current, postCount: current.postCount + 1 }
        : current);
      saveCurrentScreen('tab');
      setRecipes(current => [fallbackRecipe, ...current.filter(recipe => recipe.postSeq !== postSeq)]);
      if (profileUser?.usrId === currentUserId) {
        setProfileRecipes(current => [fallbackRecipe, ...current.filter(recipe => recipe.postSeq !== postSeq)]);
      }
      setDetailRecipe(fallbackRecipe);
      setSelectedRecipeId(String(postSeq));
      setPage('detail');

      try {
        const savedRecipe = toRecipe(await getRecipe(postSeq));
        setRecipes(current => current.map(recipe => recipe.postSeq === postSeq ? savedRecipe : recipe));
        setDetailRecipe(current => current?.postSeq === postSeq ? savedRecipe : current);
      } catch (error) {
        Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
      }
    } catch (error) {
      Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const editRecipe = async (draft: RecipeDraft) => {
    if (!detailRecipe?.postSeq) return;
    const postSeq = detailRecipe.postSeq;
    const timer = setTimeout(() => setLoading(true), 500);
    try {
      await updateRecipeApi(postSeq, draft);
      const updated = toRecipe(await getRecipe(postSeq));
      setRecipes(current => current.map(recipe => recipe.postSeq === postSeq ? updated : recipe));
      setProfileRecipes(current => current.map(recipe => recipe.postSeq === postSeq ? updated : recipe));
      setDetailRecipe(updated);
      setSelectedRecipeId(String(postSeq));
      setPage('detail');
    } catch (error) {
      Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const confirmDeleteRecipe = (recipe: Recipe) => {
    if (!recipe.postSeq || !recipe.isMine) return;
    Alert.alert('레시피 삭제', getMsg('COMMON', '009'), [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => { void performDeleteRecipe(recipe); },
      },
    ]);
  };

  const performDeleteRecipe = async (recipe: Recipe) => {
    if (!recipe.postSeq) return;
    const timer = setTimeout(() => setLoading(true), 500);
    try {
      await deleteRecipeApi(recipe.postSeq);
      setRecipes(current => current.filter(item => item.postSeq !== recipe.postSeq));
      setProfileRecipes(current => current.filter(item => item.postSeq !== recipe.postSeq));
      setMyProfile(current => current ? { ...current, postCount: Math.max(0, current.postCount - 1) } : current);
      setProfileUser(current => current?.usrId === currentUserId
        ? { ...current, postCount: Math.max(0, current.postCount - 1) }
        : current);
      setDetailRecipe(null);
      setSelectedRecipeId('');
      returnToPreviousScreen();
    } catch (error) {
      Alert.alert('레시피', error instanceof Error ? error.message : getMsg('COMMON', '023'));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const commonRecipeProps = {
    token: accessToken,
    savedIds,
    categories,
    onOpenRecipe: openRecipe,
    onToggleSaved: toggleSaved,
    onToggleLike: toggleLiked,
    onAuthorPress: openUserProfile,
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <RecipeHomeScreen
            recipes={currentRecipes}
            filteredRecipes={currentRecipes}
            isLoading={isQueryLoading}
            searchText={searchText}
            selectedCategory={selectedCategory}
            onSearchChange={setSearchText}
            onCategoryChange={setSelectedCategory}
            onLogout={handleLogout}
            onRefresh={refreshCurrentTab}
            refreshing={tabRefreshing}
            {...commonRecipeProps}
          />
        );
      case 'search':
        return (
          <RecipeSearchScreen
            recipes={currentRecipes}
            isLoading={isQueryLoading}
            searchText={searchText}
            selectedCategory={selectedCategory}
            onSearchChange={setSearchText}
            onCategoryChange={setSelectedCategory}
            onRefresh={refreshCurrentTab}
            refreshing={tabRefreshing}
            {...commonRecipeProps}
          />
        );
      case 'saved':
        return <RecipeSavedScreen recipes={currentRecipes} isLoading={isQueryLoading} {...commonRecipeProps} />;
      case 'myRecipes':
        return (
          <RecipeUserScreen
            profile={myProfile}
            recipes={currentRecipes}
            token={accessToken}
            loading={myProfileLoading || isQueryLoading || !accessToken || !currentUserId}
            isOwn
            savedIds={savedIds}
            savedCount={savedCount}
            loadError={myProfileError}
            ownTitle={menuName}
            onToggleFollow={() => undefined}
            onRelationPress={openFollowList}
            onWrite={() => setPage('write')}
            onLogout={handleLogout}
            onRetry={() => { void loadMyProfile(); }}
            onOpenRecipe={openRecipe}
            onToggleSaved={toggleSaved}
            onToggleLike={toggleLiked}
            onAuthorPress={openUserProfile}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {page === 'follows' ? (
        <View style={styles.container}>
          <RecipeHeader title="팔로워 및 팔로잉" onBack={returnToPreviousScreen} />
          <CommunityFollowListScreen
            token={accessToken}
            relationType={followRelationType}
            followerCount={profileUser?.usrId === currentUserId
              ? profileUser.followerCount
              : myProfile?.followerCount ?? 0}
            followingCount={profileUser?.usrId === currentUserId
              ? profileUser.followingCount
              : myProfile?.followingCount ?? 0}
            onRelationTypeChange={setFollowRelationType}
            onUserSelect={openUserProfile}
            onToggleFollow={toggleFollowFromList}
            onRemoveFollower={removeFollowerFromList}
            onRelationChanged={() => { void refreshMyProfileCounts(); }}
          />
        </View>
      ) : page === 'profile' ? (
        profileUser ? (
          <RecipeUserScreen
            profile={profileUser}
            recipes={profileRecipes}
            token={accessToken}
            loading={profileLoading}
            isOwn={profileUser.usrId === currentUserId}
            savedIds={profileRecipes.filter(recipe => recipe.savedByMe).map(recipe => recipe.id)}
            savedCount={profileUser.usrId === currentUserId ? savedCount : undefined}
            ownTitle={menuName}
            onBack={returnFromUserProfile}
            onToggleFollow={() => { void toggleProfileFollow(); }}
            onRelationPress={profileUser.usrId === currentUserId ? openFollowList : undefined}
            onWrite={profileUser.usrId === currentUserId ? () => setPage('write') : undefined}
            onLogout={profileUser.usrId === currentUserId ? handleLogout : undefined}
            onOpenRecipe={openRecipe}
            onToggleSaved={toggleSaved}
            onToggleLike={toggleLiked}
            onAuthorPress={openUserProfile}
          />
        ) : <View style={styles.container} />
      ) : page === 'detail' && selectedRecipe ? (
        <RecipeDetailScreen
          recipe={selectedRecipe}
          token={accessToken}
          saved={Boolean(selectedRecipe.savedByMe)}
          liked={Boolean(selectedRecipe.likedByMe)}
          currentUserId={currentUserId}
          onBack={returnFromRecipeDetail}
          onToggleSaved={() => { void toggleSaved(selectedRecipe.id); }}
          onToggleLike={() => { void toggleLiked(selectedRecipe.id); }}
          onEdit={() => setPage('edit')}
          onDelete={() => confirmDeleteRecipe(selectedRecipe)}
          onAuthorPress={openUserProfile}
          onCommentCountChange={delta => {
            const updateCommentCount = (recipe: Recipe) => ({
              ...recipe,
              commentCount: Math.max(0, (recipe.commentCount ?? 0) + delta),
            });
            setDetailRecipe(current => current?.id === selectedRecipe.id
              ? updateCommentCount(current)
              : current);
            setRecipes(current => current.map(recipe => recipe.id === selectedRecipe.id
              ? updateCommentCount(recipe)
              : recipe));
            setProfileRecipes(current => current.map(recipe => recipe.id === selectedRecipe.id
              ? updateCommentCount(recipe)
              : recipe));
            updateProfileUnderDetail(selectedRecipe.id, updateCommentCount);
          }}
        />
      ) : page === 'write' ? (
        <RecipeCreateScreen
          onBack={() => setPage('tab')}
          onSubmit={addRecipe}
          commonCodes={commonCodes}
          commonCodeGroups={commonCodeGroups}
          commonCodesLoading={commonCodesLoading}
          ingredientUnitMappings={ingredientUnitMappings}
          ingredientUnitMappingsLoading={ingredientUnitMappingsLoading}
          ingredientUnitMappingsError={ingredientUnitMappingsError}
          categories={categories}
          difficulties={difficulties}
        />
      ) : page === 'edit' && selectedRecipe ? (
        <RecipeCreateScreen
          onBack={() => setPage('detail')}
          onSubmit={editRecipe}
          initialDraft={toRecipeDraft(selectedRecipe, categories, difficulties)}
          currentPhotoFilSeq={selectedRecipe.finishedPhotoFilSeq}
          token={accessToken}
          commonCodes={commonCodes}
          commonCodeGroups={commonCodeGroups}
          commonCodesLoading={commonCodesLoading}
          ingredientUnitMappings={ingredientUnitMappings}
          ingredientUnitMappingsLoading={ingredientUnitMappingsLoading}
          ingredientUnitMappingsError={ingredientUnitMappingsError}
          categories={categories}
          difficulties={difficulties}
        />
      ) : renderTab()}
      <BrandLoader
        visible={loading || loggingOut || profileLoading || myProfileLoading
          || (page === 'tab' && activeTab === 'myRecipes' && isQueryLoading)}
      />
      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function toRecipe(row: RecipeResponse): Recipe {
  const initials = row.authorName?.trim().slice(0, 1) || '한';
  return {
    id: String(row.postSeq),
    postSeq: row.postSeq,
    title: row.title,
    description: row.description || '',
    category: row.categoryName || '레시피',
    categoryCode: row.categoryCode,
    finishedPhotoFilSeq: row.finishedPhotoFilSeq,
    profileImageFilSeq: row.profileImageFilSeq,
    cookingMinutes: row.cookingMinutes ?? 0,
    rating: String(row.likeCount ?? 0),
    likeCount: row.likeCount ?? 0,
    likedByMe: row.likedByMe,
    commentCount: row.commentCount ?? 0,
    saves: row.saveCount ?? 0,
    author: row.authorName || '한끼모아 사용자',
    authorId: row.authorId,
    authorInitial: initials,
    emoji: '🍲',
    artwork: '#D8A45B',
    ingredients: (row.ingredients ?? []).map(item => {
      const quantity = item.ingrAmt == null ? '' : ` ${item.ingrAmt}${item.unitName ? ` ${item.unitName}` : ''}`;
      const note = item.note ? ` · ${item.note}` : '';
      return `${item.ingrName}${quantity}${note}`;
    }),
    steps: (row.steps ?? []).map(step => step.content),
    servings: row.servings,
    difficulty: row.difficultyName,
    difficultyCode: row.difficultyCode,
    savedByMe: row.savedByMe,
    isMine: row.mine,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ingredientItems: (row.ingredients ?? []).map(item => ({
      ingredientGroupCode: item.ingredientGroupCode,
      ingredientCode: item.ingredientCode,
      ingredientName: item.ingrName,
      amount: item.ingrAmt == null ? '' : String(item.ingrAmt),
      unitCode: item.unitCode ?? '',
      unitName: item.unitName ?? '',
      note: item.note ?? undefined,
    })),
  };
}

function toRecipeDraft(
  recipe: Recipe,
  categories: RecipeCategory[],
  difficulties: RecipeCategory[],
): RecipeDraft {
  const categoryCode = recipe.categoryCode ?? categories.find(item => item.name === recipe.category)?.code ?? '';
  const difficultyCode = recipe.difficultyCode ?? difficulties.find(item => item.name === recipe.difficulty)?.code ?? '';
  return {
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    categoryCode,
    difficulty: recipe.difficulty ?? '',
    difficultyCode,
    cookingMinutes: String(recipe.cookingMinutes || 20),
    servings: String(recipe.servings || 2),
    ingredients: recipe.ingredientItems ?? [],
    steps: recipe.steps.join('\n'),
    finishedPhoto: null,
  };
}

function toDraftRecipe(draft: RecipeDraft, postSeq: number): Recipe {
  const ingredients = draft.ingredients.map(item => {
    const amount = item.amount.trim();
    const measurement = amount ? ` ${amount}${item.unitName ? ` ${item.unitName}` : ''}` : '';
    return `${item.ingredientName}${measurement}`;
  });
  return {
    id: String(postSeq),
    postSeq,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    categoryCode: draft.categoryCode,
    cookingMinutes: Number(draft.cookingMinutes) || 20,
    servings: Number(draft.servings) || 2,
    rating: '0',
    saves: 0,
    author: '나',
    authorInitial: '나',
    emoji: '🍳',
    artwork: '#EFC77C',
    finishedPhotoUri: draft.finishedPhoto?.uri,
    ingredients,
    ingredientItems: draft.ingredients,
    steps: draft.steps.split('\n').map(item => item.trim()).filter(Boolean),
    difficulty: draft.difficulty,
    difficultyCode: draft.difficultyCode,
    isMine: true,
    likedByMe: false,
    likeCount: 0,
    commentCount: 0,
    savedByMe: false,
  };
}

export default RecipeAppScreen;
