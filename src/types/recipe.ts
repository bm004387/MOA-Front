export type RecipeTab = 'home' | 'search' | 'saved' | 'myRecipes';

export interface Recipe {
  id: string;
  postSeq?: number;
  title: string;
  description: string;
  category: string;
  categoryCode?: string;
  finishedPhotoFilSeq?: number | null;
  finishedPhotoUri?: string;
  cookingMinutes: number;
  rating: string;
  likeCount?: number;
  commentCount?: number;
  saves: number;
  author: string;
  authorId?: string;
  profileImageFilSeq?: number | null;
  authorInitial: string;
  createdAt?: string;
  emoji: string;
  artwork: string;
  ingredients: string[];
  ingredientItems?: RecipeIngredientDraft[];
  steps: string[];
  servings?: number | null;
  difficulty?: string;
  difficultyCode?: string;
  savedByMe?: boolean;
  likedByMe?: boolean;
  isMine?: boolean;
}

export interface RecipeCategory {
  code: string;
  name: string;
}

export interface RecipeDraft {
  title: string;
  description: string;
  category: string;
  categoryCode: string;
  difficulty: string;
  difficultyCode: string;
  cookingMinutes: string;
  servings: string;
  ingredients: RecipeIngredientDraft[];
  steps: string;
  finishedPhoto?: RecipeFinishedPhoto | null;
}

export interface RecipeFinishedPhoto {
  uri: string;
  fileName?: string | null;
  type?: string | null;
}

export interface RecipeIngredientDraft {
  ingredientGroupCode: string;
  ingredientCode: string;
  ingredientName: string;
  amount: string;
  unitCode: string;
  unitName: string;
  note?: string;
}

export const RECIPE_CATEGORIES = ['전체', '집밥', '간단요리', '한그릇', '디저트'];
