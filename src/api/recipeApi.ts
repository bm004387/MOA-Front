import { API_BASE_URL } from '../config/environment';
import { authenticatedFetch, getRequiredAccessToken } from './apiClient';
import { getCachedMsg } from '../utils/msgUtil';
import type { RecipeDraft } from '../types/recipe';

export interface RecipeIngredientResponse {
  sortOrd: number;
  ingrSeq: number | null;
  ingredientGroupCode: string;
  ingredientCode: string;
  ingrName: string;
  ingrAmt: number | null;
  unitCode: string | null;
  unitName: string | null;
  note: string | null;
}

export interface RecipeStepResponse {
  stepNo: number;
  content: string;
  cookSec: number | null;
  stepFilSeq: number | null;
}

export interface RecipeResponse {
  postSeq: number;
  title: string;
  description: string;
  categoryCode: string;
  categoryName: string;
  cookingMinutes: number;
  servings: number | null;
  difficultyCode: string;
  difficultyName: string;
  authorId: string;
  authorName: string;
  profileImageFilSeq: number | null;
  finishedPhotoFilSeq: number | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  mine: boolean;
  ingredients: RecipeIngredientResponse[];
  steps: RecipeStepResponse[];
}

export interface RecipeQuery {
  scope: 'all' | 'mine' | 'saved';
  query?: string;
  categoryCode?: string;
  authorId?: string;
  limit?: number;
}

export interface RecipeIngredientUnitMapping {
  ingredientGroupCode: string;
  ingredientCode: string;
  unitCode: string;
  sortOrd: number;
}

async function throwApiError(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null) as { message?: string; detail?: string } | null;
  throw new Error(payload?.message || payload?.detail || getCachedMsg('COMMON', '023'));
}

/** 인증된 사용자의 레시피 목록을 조회합니다. */
export async function getRecipes(query: RecipeQuery): Promise<{ recipes: RecipeResponse[]; savedCount: number | null }> {
  const accessToken = await getRequiredAccessToken();
  const params = new URLSearchParams({
    scope: query.scope,
    query: query.query ?? '',
    limit: String(query.limit ?? 50),
  });
  if (query.categoryCode) {
    params.set('categoryCode', query.categoryCode);
  }
  if (query.authorId) {
    params.set('authorId', query.authorId);
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes?${params.toString()}`, accessToken);
  if (!response.ok) {
    await throwApiError(response);
  }
  const savedCountHeader = response.headers.get('X-Saved-Count');
  return {
    recipes: await response.json(),
    savedCount: savedCountHeader == null ? null : Number(savedCountHeader),
  };
}

/** 레시피 상세와 재료·조리 순서를 조회합니다. */
export async function getRecipe(postSeq: number): Promise<RecipeResponse> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/${postSeq}`, accessToken);
  if (!response.ok) {
    await throwApiError(response);
  }
  return response.json();
}

/** 재료별로 선택할 수 있는 계량 단위 코드를 조회합니다. */
export async function getRecipeIngredientUnitMappings(): Promise<RecipeIngredientUnitMapping[]> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/ingredient-units`, accessToken);
  if (!response.ok) {
    await throwApiError(response);
  }
  return response.json();
}

/** 레시피 작성 폼의 내용을 서버에 등록하고 게시물 일련번호를 반환합니다. */
export async function createRecipe(draft: RecipeDraft): Promise<number> {
  const accessToken = await getRequiredAccessToken();
  const recipe = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    categoryCode: draft.categoryCode,
    difficultyCode: draft.difficultyCode,
    cookingMinutes: Number(draft.cookingMinutes) || 20,
    servings: Number(draft.servings) || 2,
    ingredients: draft.ingredients.map(ingredient => ({
      ingredientGroupCode: ingredient.ingredientGroupCode,
      ingredientCode: ingredient.ingredientCode,
      ingredientName: ingredient.ingredientName,
      amount: ingredient.amount.trim(),
      unitCode: ingredient.unitCode || null,
      note: ingredient.note?.trim() || null,
    })),
    steps: draft.steps,
  };
  let options: RequestInit;
  if (draft.finishedPhoto?.uri) {
    const body = new FormData();
    body.append('request', JSON.stringify(recipe));
    body.append('finishedPhoto', {
      uri: draft.finishedPhoto.uri,
      name: draft.finishedPhoto.fileName || 'recipe-photo.jpg',
      type: draft.finishedPhoto.type || 'image/jpeg',
    } as unknown as Blob);
    options = { method: 'POST', body };
  } else {
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    };
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes`, accessToken, options);
  if (!response.ok) {
    await throwApiError(response);
  }

  const result = await response.json() as { postSeq?: unknown };
  if (typeof result.postSeq !== 'number' || !Number.isFinite(result.postSeq) || result.postSeq <= 0) {
    throw new Error(getCachedMsg('COMMON', '023'));
  }
  return result.postSeq;
}

/** 작성자 본인의 레시피 내용을 갱신합니다. */
export async function updateRecipe(postSeq: number, draft: RecipeDraft): Promise<void> {
  const accessToken = await getRequiredAccessToken();
  const recipe = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    categoryCode: draft.categoryCode,
    difficultyCode: draft.difficultyCode,
    cookingMinutes: Number(draft.cookingMinutes) || 20,
    servings: Number(draft.servings) || 2,
    ingredients: draft.ingredients.map(ingredient => ({
      ingredientGroupCode: ingredient.ingredientGroupCode,
      ingredientCode: ingredient.ingredientCode,
      ingredientName: ingredient.ingredientName,
      amount: ingredient.amount.trim(),
      unitCode: ingredient.unitCode || null,
      note: ingredient.note?.trim() || null,
    })),
    steps: draft.steps,
  };
  let options: RequestInit;
  if (draft.finishedPhoto?.uri) {
    const body = new FormData();
    body.append('request', JSON.stringify(recipe));
    body.append('finishedPhoto', {
      uri: draft.finishedPhoto.uri,
      name: draft.finishedPhoto.fileName || 'recipe-photo.jpg',
      type: draft.finishedPhoto.type || 'image/jpeg',
    } as unknown as Blob);
    options = { method: 'PUT', body };
  } else {
    options = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    };
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/${postSeq}`, accessToken, options);
  if (!response.ok) {
    await throwApiError(response);
  }
}

/** 작성자 본인의 레시피를 삭제 상태로 전환합니다. */
export async function deleteRecipe(postSeq: number): Promise<void> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/${postSeq}`, accessToken, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await throwApiError(response);
  }
}

/** 로그인 사용자의 레시피 좋아요 상태를 변경합니다. */
export async function setRecipeLiked(postSeq: number, enabled: boolean): Promise<void> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/${postSeq}/like`, accessToken, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) {
    await throwApiError(response);
  }
}

/** 레시피를 저장하거나 저장 취소합니다. */
export async function setRecipeSaved(postSeq: number, enabled: boolean): Promise<void> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/recipes/${postSeq}/save`, accessToken, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) {
    await throwApiError(response);
  }
}
