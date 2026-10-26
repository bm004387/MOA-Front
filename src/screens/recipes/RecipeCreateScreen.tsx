import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { API_BASE_URL } from '../../config/environment';
import RecipeCategories from '../../components/recipes/RecipeCategories';
import RecipeHeader from '../../components/recipes/RecipeHeader';
import RecipeIngredientPickerModal, { type RecipePickerGroup, type RecipePickerOption } from '../../components/recipes/RecipeIngredientPickerModal';
import type { CommonCodeGroupItem, CommonCodeItem } from '../../api/commonCodeApi';
import type { RecipeIngredientUnitMapping } from '../../api/recipeApi';
import { getCommonCodeValues } from '../../utils/commonCodeUtil';
import useMsg from '../../hooks/useMsg';
import type { RecipeDraft, RecipeIngredientDraft } from '../../types/recipe';
import styles from '../../styles/recipeApp';

const INGREDIENT_GROUP_PREFIX = 'RCP_INGR_';
const UNIT_GROUP_CODE = 'RCP_UNIT';

function isIngredientCodeGroup(code: string): boolean {
  const normalizedCode = code.trim().toUpperCase();
  return normalizedCode === 'RCP_INGR'
    || normalizedCode === 'INGR'
    || normalizedCode.startsWith(INGREDIENT_GROUP_PREFIX)
    || normalizedCode.startsWith('INGR_');
}

function RecipeCreateScreen({
  onBack,
  onSubmit,
  initialDraft,
  currentPhotoFilSeq,
  token,
  commonCodes,
  commonCodeGroups,
  commonCodesLoading,
  ingredientUnitMappings,
  ingredientUnitMappingsLoading,
  ingredientUnitMappingsError,
  categories,
  difficulties,
}: {
  onBack: () => void;
  onSubmit: (draft: RecipeDraft) => Promise<void>;
  initialDraft?: RecipeDraft;
  currentPhotoFilSeq?: number | null;
  token?: string;
  commonCodes: CommonCodeItem[];
  commonCodeGroups: CommonCodeGroupItem[];
  commonCodesLoading: boolean;
  ingredientUnitMappings: RecipeIngredientUnitMapping[];
  ingredientUnitMappingsLoading: boolean;
  ingredientUnitMappingsError: boolean;
  categories: Array<{ code: string; name: string }>;
  difficulties: Array<{ code: string; name: string }>;
}) {
  const { getMsg } = useMsg();
  const editing = Boolean(initialDraft);
  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [description, setDescription] = useState(initialDraft?.description ?? '');
  const [categoryCode, setCategoryCode] = useState(initialDraft?.categoryCode ?? '');
  const [difficultyCode, setDifficultyCode] = useState(initialDraft?.difficultyCode ?? '');
  const [cookingMinutes, setCookingMinutes] = useState(initialDraft?.cookingMinutes ?? '20');
  const [servings, setServings] = useState(initialDraft?.servings ?? '2');
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>(initialDraft?.ingredients ?? []);
  const [steps, setSteps] = useState(initialDraft?.steps ?? '');
  const [finishedPhoto, setFinishedPhoto] = useState<RecipeDraft['finishedPhoto']>(null);
  const [titleError, setTitleError] = useState('');
  const [ingredientError, setIngredientError] = useState('');
  const [stepsError, setStepsError] = useState('');
  const [numberError, setNumberError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickerMode, setPickerMode] = useState<'ingredient' | 'unit' | null>(null);
  const [unitTargetIndex, setUnitTargetIndex] = useState<number | null>(null);
  const confirmingSubmitRef = useRef(false);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const titleInputRef = useRef<TextInputInstance | null>(null);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some(item => item.code === categoryCode)) {
      setCategoryCode(categories[0].code);
    }
  }, [categories, categoryCode]);

  useEffect(() => {
    if (difficulties.length === 0) return;
    if (!difficulties.some(item => item.code === difficultyCode)) {
      setDifficultyCode(difficulties[0].code);
    }
  }, [difficulties, difficultyCode]);

  const ingredientGroups = useMemo(() => {
    const itemsByGroup = new Map<string, RecipePickerOption[]>();
    commonCodes.forEach(item => {
      const code = item.comCd.trim().toUpperCase();
      if (!isIngredientCodeGroup(code)) return;
      const groupItems = itemsByGroup.get(code) ?? [];
      groupItems.push({
        groupCode: code,
        groupName: item.comCdNm || '재료',
        code: item.comDtlCd,
        name: item.comDtlDesc || item.comDtlNm,
      });
      itemsByGroup.set(code, groupItems);
    });
    return commonCodeGroups
      .filter(group => isIngredientCodeGroup(group.comCd))
      .map(group => ({
        code: group.comCd.trim().toUpperCase(),
        name: group.comCdNm || '재료',
        parentCode: group.prntComCd?.trim().toUpperCase() ?? null,
        sortOrd: group.sortOrd,
        items: itemsByGroup.get(group.comCd.trim().toUpperCase()) ?? [],
      }))
      .sort((left, right) => left.sortOrd - right.sortOrd || left.code.localeCompare(right.code));
  }, [commonCodeGroups, commonCodes]);

  const unitOptions = useMemo(() => commonCodes
    .filter(item => item.comCd.trim().toUpperCase() === UNIT_GROUP_CODE)
    .map(item => ({
      groupCode: UNIT_GROUP_CODE,
      groupName: item.comCdNm || '계량 단위',
      code: item.comDtlCd,
      name: item.comDtlDesc || item.comDtlNm,
    })), [commonCodes]);
  const unitTarget = unitTargetIndex === null ? undefined : ingredients[unitTargetIndex];
  const unitPickerOptions = useMemo(() => {
    if (!unitTarget) return [];
    const unitsByCode = new Map(unitOptions.map(item => [item.code, item]));
    return ingredientUnitMappings
      .filter(mapping => mapping.ingredientGroupCode.trim().toUpperCase() === unitTarget.ingredientGroupCode.trim().toUpperCase()
        && mapping.ingredientCode.trim() === unitTarget.ingredientCode.trim())
      .sort((left, right) => left.sortOrd - right.sortOrd || left.unitCode.localeCompare(right.unitCode))
      .flatMap(mapping => {
        const option = unitsByCode.get(mapping.unitCode);
        return option ? [option] : [];
      });
  }, [ingredientUnitMappings, unitOptions, unitTarget]);

  const saveRecipe = async (draft: RecipeDraft) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(draft);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (submitting || confirmingSubmitRef.current || !categoryCode || !difficultyCode) return;
    if (!title.trim()) {
      setTitleError(getMsg('RECIPE', '003'));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      requestAnimationFrame(() => titleInputRef.current?.focus());
      return;
    }
    if (Number(cookingMinutes) < 1 || Number(servings) < 1) {
      setNumberError(getMsg('RECIPE', '005'));
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    if (ingredients.length === 0) {
      setIngredientError(getMsg('RECIPE', '006'));
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    if (ingredients.some(item => item.amount.trim() && !item.unitCode)) {
      setIngredientError(getMsg('RECIPE', '011'));
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    if (!steps.trim()) {
      setStepsError(getMsg('RECIPE', '012'));
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }

    const draft: RecipeDraft = {
      title,
      description,
      category: categories.find(item => item.code === categoryCode)?.name ?? '',
      categoryCode,
      difficulty: difficulties.find(item => item.code === difficultyCode)?.name ?? '',
      difficultyCode,
      cookingMinutes,
      servings,
      ingredients,
      steps,
      finishedPhoto,
    };

    confirmingSubmitRef.current = true;
    Alert.alert('레시피 저장', getMsg('RECIPE', '020'), [
      {
        text: '취소',
        style: 'cancel',
        onPress: () => { confirmingSubmitRef.current = false; },
      },
      {
        text: '저장',
        onPress: () => {
          confirmingSubmitRef.current = false;
          void saveRecipe(draft);
        },
      },
    ], {
      cancelable: true,
      onDismiss: () => { confirmingSubmitRef.current = false; },
    });
  };

  const selectFinishedPhoto = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel) return;
      if (result.errorMessage) throw new Error(result.errorMessage);

      const asset = result.assets?.[0];
      const contentType = asset?.type?.trim().toLowerCase();
      const normalizedType = contentType === 'image/jpg' ? 'image/jpeg' : contentType;
      const supportedTypes = await getCommonCodeValues('CONT_TYP');
      if (!asset?.uri || !normalizedType?.startsWith('image/') || !supportedTypes.includes(normalizedType)) {
        throw new Error(getMsg('MYINFO', '007'));
      }

      setFinishedPhoto({
        uri: asset.uri,
        fileName: asset.fileName || `recipe-${Date.now()}.${normalizedType.split('/')[1] || 'jpg'}`,
        type: normalizedType,
      });
    } catch (error) {
      Alert.alert(getMsg('RECIPE', '015'), error instanceof Error ? error.message : getMsg('COMMON', '023'));
    }
  };

  const addIngredient = (item: RecipePickerOption) => {
    setIngredients(current => [...current, {
      ingredientGroupCode: item.groupCode,
      ingredientCode: item.code,
      ingredientName: item.name,
      amount: '',
      unitCode: '',
      unitName: '',
    }]);
    setPickerMode(null);
    setIngredientError('');
  };

  const setUnit = (item: RecipePickerOption) => {
    if (unitTargetIndex !== null) {
      setIngredients(current => current.map((ingredient, index) => index === unitTargetIndex
        ? { ...ingredient, unitCode: item.code, unitName: item.name }
        : ingredient));
    }
    setPickerMode(null);
    setUnitTargetIndex(null);
    setIngredientError('');
  };

  return (
    <>
      <RecipeHeader title={editing ? '레시피 수정' : '레시피 작성'} onBack={onBack} right={(
        <Pressable accessibilityRole="button" disabled={submitting || !categoryCode || !difficultyCode} onPress={submit} style={styles.publishButton}>
          <Text style={styles.publishButtonText}>{editing ? '저장' : '등록'}</Text>
        </Pressable>
      )} />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.composerContent}>
        <View style={styles.photoUpload}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={getMsg('RECIPE', '017')}
            onPress={() => void selectFinishedPhoto()}
            style={styles.photoSelectArea}>
            {finishedPhoto?.uri ? (
              <>
                <Image source={{ uri: finishedPhoto.uri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={styles.photoSelectedOverlay}>
                  <Text style={styles.photoSelectedText}>{getMsg('RECIPE', '017')}</Text>
                </View>
              </>
            ) : editing && currentPhotoFilSeq && token ? (
              <>
                <Image
                  source={{
                    uri: `${API_BASE_URL}/api/community/files/${currentPhotoFilSeq}`,
                    headers: { Authorization: `Bearer ${token}` },
                  }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                <View style={styles.photoSelectedOverlay}>
                  <Text style={styles.photoSelectedText}>현재 완성 사진</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.photoIconWrap}><Text style={styles.photoIcon}>＋</Text></View>
                <Text style={styles.photoTitle}>{getMsg('RECIPE', '017')}</Text>
                <Text style={styles.photoCaption}>{getMsg('RECIPE', '016')}</Text>
              </>
            )}
          </Pressable>
          {finishedPhoto && (
            <Pressable accessibilityRole="button" accessibilityLabel={getMsg('RECIPE', '019')} onPress={() => setFinishedPhoto(null)} style={styles.photoRemoveButton}>
              <Text style={styles.photoRemoveText}>×</Text>
            </Pressable>
          )}
        </View>
        <FieldLabel label="레시피 이름" required />
        <TextInput
          ref={titleInputRef}
          value={title}
          onChangeText={value => { setTitle(value); setTitleError(''); }}
          placeholder="예: 엄마표 김치볶음밥"
          placeholderTextColor="#A99B90"
          style={styles.formInput}
          maxLength={40}
        />
        {!!titleError && <Text style={styles.formError}>{titleError}</Text>}
        <FieldLabel label="한 줄 소개" />
        <TextInput value={description} onChangeText={setDescription} placeholder="이 레시피의 매력을 소개해 주세요" placeholderTextColor="#A99B90" style={styles.formInput} maxLength={100} />
        <FieldLabel
          label="레시피 분류"
          required
          hint={categories.length === 0 ? (commonCodesLoading ? '불러오는 중입니다.' : '분류 공통코드가 없습니다.') : undefined}
        />
        <RecipeCategories
          selected={categoryCode}
          onSelect={setCategoryCode}
          categories={categories}
          includeAll={false}
          valueKey="code"
          allowFallback={false}
        />
        <FieldLabel
          label="난이도"
          required
          hint={difficulties.length === 0 ? (commonCodesLoading ? '불러오는 중입니다.' : '난이도 공통코드가 없습니다.') : undefined}
        />
        <RecipeCategories
          selected={difficultyCode}
          onSelect={setDifficultyCode}
          categories={difficulties}
          includeAll={false}
          valueKey="code"
          allowFallback={false}
        />
        <FieldLabel label="조리 시간" />
        <View style={styles.timeInputRow}>
          <TextInput value={cookingMinutes} onChangeText={value => { setCookingMinutes(value.replace(/[^0-9]/g, '')); setNumberError(''); }} keyboardType="number-pad" style={[styles.formInput, styles.timeInput]} />
          <Text style={styles.timeUnit}>분</Text>
        </View>
        <FieldLabel label="인분" />
        <View style={styles.timeInputRow}>
          <TextInput
            value={servings}
            onChangeText={value => { setServings(value.replace(/[^0-9]/g, '')); setNumberError(''); }}
            keyboardType="number-pad"
            style={[styles.formInput, styles.timeInput]}
          />
          <Text style={styles.timeUnit}>인분</Text>
        </View>
        {!!numberError && <Text style={styles.formError}>{numberError}</Text>}
        <FieldLabel label="재료" hint="공통코드에서 재료와 계량 단위를 선택해 주세요" />
        {ingredients.length > 0 ? (
          <View style={styles.ingredientList}>
            {ingredients.map((ingredient, index) => (
              <View key={`${ingredient.ingredientGroupCode}:${ingredient.ingredientCode}:${index}`} style={styles.ingredientEditRow}>
                <Text numberOfLines={2} style={styles.ingredientEditName}>{ingredient.ingredientName}</Text>
                <TextInput
                  value={ingredient.amount}
                  onChangeText={value => {
                    const amount = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setIngredients(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item));
                    setIngredientError('');
                  }}
                  placeholder="수량"
                  placeholderTextColor="#A99B90"
                  keyboardType="decimal-pad"
                  style={styles.ingredientAmountInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${ingredient.ingredientName} 계량 단위 선택`}
                  onPress={() => { setUnitTargetIndex(index); setPickerMode('unit'); }}
                  style={styles.ingredientUnitButton}>
                  <Text numberOfLines={1} style={styles.ingredientUnitText}>{ingredient.unitName || '단위 선택'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${ingredient.ingredientName} 삭제`}
                  onPress={() => setIngredients(current => current.filter((_, itemIndex) => itemIndex !== index))}
                  style={styles.ingredientRemoveButton}>
                  <Text style={styles.ingredientRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.ingredientEmptyText}>
            {commonCodesLoading ? '재료 공통코드를 불러오는 중입니다.' : '아직 선택한 재료가 없어요.'}
          </Text>
        )}
        <Pressable onPress={() => setPickerMode('ingredient')} style={styles.ingredientAddButton}>
          <Text style={styles.ingredientAddGlyph}>＋</Text>
          <Text style={styles.ingredientAddText}>재료 추가</Text>
        </Pressable>
        {!!ingredientError && <Text style={styles.formError}>{ingredientError}</Text>}
        <FieldLabel label="만드는 순서" hint="순서를 한 줄에 하나씩 적어주세요" />
        <TextInput value={steps} onChangeText={value => { setSteps(value); setStepsError(''); }} placeholder={'재료를 손질해요.\n팬에 재료를 볶아요.\n맛있게 담아 완성해요.'} placeholderTextColor="#A99B90" style={[styles.formInput, styles.multilineInput, styles.stepsInput]} multiline textAlignVertical="top" />
        {!!stepsError && <Text style={styles.formError}>{stepsError}</Text>}
        <Pressable accessibilityRole="button" disabled={submitting || !categoryCode || !difficultyCode} onPress={submit} style={styles.submitRecipeButton}>
          <Text style={styles.submitRecipeButtonText}>{editing ? '레시피 수정하기' : '레시피 등록하기'}</Text>
        </Pressable>
      </ScrollView>
      <RecipeIngredientPickerModal
        visible={pickerMode === 'ingredient'}
        title="재료 선택"
        mode="ingredient"
        groups={ingredientGroups}
        onClose={() => setPickerMode(null)}
        onSelect={addIngredient}
      />
      <RecipeIngredientPickerModal
        visible={pickerMode === 'unit'}
        title="계량 단위 선택"
        mode="unit"
        items={unitPickerOptions}
        unitEmptyHint={ingredientUnitMappingsLoading
          ? getMsg('COMMON', '053')
          : ingredientUnitMappingsError
            ? getMsg('RECIPE', '014')
            : getMsg('RECIPE', '013')}
        onClose={() => { setPickerMode(null); setUnitTargetIndex(null); }}
        onSelect={setUnit}
      />
    </>
  );
}

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.requiredMark}> *</Text> : null}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

export default RecipeCreateScreen;
