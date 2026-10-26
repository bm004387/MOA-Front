import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import styles from '../../styles/recipeApp';

const ROOT_INGREDIENT_GROUP = 'RCP_INGR';

export interface RecipePickerOption {
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
}

export interface RecipePickerGroup {
  code: string;
  name: string;
  parentCode?: string | null;
  sortOrd: number;
  items: RecipePickerOption[];
}

interface RecipeIngredientPickerModalProps {
  visible: boolean;
  title: string;
  mode: 'ingredient' | 'unit';
  groups?: RecipePickerGroup[];
  items?: RecipePickerOption[];
  unitEmptyHint?: string;
  onClose: () => void;
  onSelect: (item: RecipePickerOption) => void;
}

function RecipeIngredientPickerModal({
  visible,
  title,
  mode,
  groups = [],
  items = [],
  unitEmptyHint,
  onClose,
  onSelect,
}: RecipeIngredientPickerModalProps) {
  const [selectedGroupCode, setSelectedGroupCode] = useState(ROOT_INGREDIENT_GROUP);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedGroupCode(ROOT_INGREDIENT_GROUP);
      setQuery('');
    }
  }, [visible, mode]);

  const allIngredients = useMemo(
    () => groups.flatMap(group => group.items),
    [groups],
  );
  const currentGroup = groups.find(group => group.code === selectedGroupCode);
  const childGroups = useMemo(
    () => groups
      .filter(group => group.parentCode === selectedGroupCode)
      .sort((left, right) => left.sortOrd - right.sortOrd || left.code.localeCompare(right.code)),
    [groups, selectedGroupCode],
  );
  const parentGroup = currentGroup?.parentCode
    ? groups.find(group => group.code === currentGroup.parentCode)
    : undefined;

  const visibleItems = useMemo(() => {
    const source = mode === 'ingredient'
      ? query.trim() ? allIngredients : currentGroup?.items ?? []
      : items;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return source;
    return source.filter(item => item.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [allIngredients, currentGroup, items, mode, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  const select = (item: RecipePickerOption) => {
    setQuery('');
    onSelect(item);
  };

  const navigateTo = (code: string) => {
    setSelectedGroupCode(code);
    setQuery('');
  };

  const isSearching = mode === 'ingredient' && query.trim().length > 0;
  const showCategories = mode === 'ingredient' && !isSearching && childGroups.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={close}>
      <View style={styles.ingredientModalBackdrop}>
        <Pressable style={styles.ingredientModalDismissArea} onPress={close} />
        <View style={styles.ingredientModalSheet}>
          <View style={styles.ingredientModalHeading}>
            <View>
              <Text style={styles.ingredientModalTitle}>{title}</Text>
              <Text style={styles.ingredientModalCaption}>
                {mode === 'ingredient' ? '분류를 선택한 뒤 재료를 골라 주세요.' : '재료에 맞는 계량 단위를 선택해 주세요.'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={styles.ingredientModalClose}>
              <Text style={styles.ingredientModalCloseText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.ingredientSearchInputWrap}>
            <Text style={styles.ingredientSearchGlyph}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={mode === 'ingredient' ? '모든 재료 검색' : '계량 단위 검색'}
              placeholderTextColor="#A99B90"
              style={styles.ingredientSearchInput}
              returnKeyType="search"
            />
          </View>

          {mode === 'ingredient' && !isSearching && selectedGroupCode !== ROOT_INGREDIENT_GROUP ? (
            <Pressable onPress={() => navigateTo(parentGroup?.code ?? ROOT_INGREDIENT_GROUP)} style={styles.ingredientOptionRow}>
              <Text style={styles.ingredientOptionArrow}>‹</Text>
              <View style={styles.ingredientOptionTextWrap}>
                <Text style={styles.ingredientOptionName}>{parentGroup?.name ?? '재료 분류'}</Text>
              </View>
            </Pressable>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.ingredientOptionList}>
            {showCategories ? childGroups.map(group => (
              <Pressable key={group.code} onPress={() => navigateTo(group.code)} style={styles.ingredientOptionRow}>
                <View style={styles.ingredientOptionTextWrap}>
                  <Text style={styles.ingredientOptionName}>{group.name}</Text>
                </View>
                <Text style={styles.ingredientOptionArrow}>›</Text>
              </Pressable>
            )) : visibleItems.length > 0 ? visibleItems.map(item => (
              <Pressable key={`${item.groupCode}:${item.code}`} onPress={() => select(item)} style={styles.ingredientOptionRow}>
                <View style={styles.ingredientOptionTextWrap}>
                  <Text style={styles.ingredientOptionName}>{item.name}</Text>
                  {isSearching ? <Text style={styles.ingredientOptionGroup}>{item.groupName}</Text> : null}
                </View>
                <Text style={styles.ingredientOptionArrow}>›</Text>
              </Pressable>
            )) : (
              <View style={styles.ingredientOptionEmpty}>
                <Text style={styles.ingredientOptionEmptyTitle}>
                  {mode === 'ingredient'
                    ? '등록된 재료가 없어요'
                    : '선택한 재료에 연결된 단위가 없어요'}
                </Text>
                <Text style={styles.ingredientOptionEmptyCaption}>
                  {mode === 'ingredient'
                    ? '재료 분류와 상세 공통코드를 등록해 주세요.'
                    : unitEmptyHint ?? '재료-계량 단위 연결 정보와 사용 상태를 확인해 주세요.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default RecipeIngredientPickerModal;
