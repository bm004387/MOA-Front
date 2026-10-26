import { API_BASE_URL } from '../config/environment';
import { authenticatedFetch, getRequiredAccessToken } from './apiClient';
import { getCachedMsg } from '../utils/msgUtil';

export interface CommonCodeItem {
  comCd: string;
  comCdNm: string;
  comCdSortOrd?: number;
  prntComCd?: string | null;
  comDtlCd: string;
  comDtlNm: string;
  comDtlDesc: string;
  remk1?: string | null;
  remk2?: string | null;
  remk3?: string | null;
  remk4?: string | null;
  sortOrd: number;
}

export interface CommonCodeGroupItem {
  comCd: string;
  comCdNm: string;
  comCdDesc?: string | null;
  prntComCd?: string | null;
  sortOrd: number;
}

export async function getCommonCodeList(): Promise<CommonCodeItem[]> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/common-codes/all`, accessToken);
  if (!response.ok) {
    throw new Error(getCachedMsg('COMMON', '023'));
  }
  return response.json();
}

export async function getCommonCodeGroupList(): Promise<CommonCodeGroupItem[]> {
  const accessToken = await getRequiredAccessToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/common-codes/groups`, accessToken);
  if (!response.ok) {
    throw new Error(getCachedMsg('COMMON', '023'));
  }
  return response.json();
}
