function parseRecipeDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeTime(value: Date): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (elapsedSeconds < 60) return '방금 전';
  if (elapsedSeconds < 60 * 60) return `${Math.floor(elapsedSeconds / 60)}분 전`;
  if (elapsedSeconds < 60 * 60 * 24) return `${Math.floor(elapsedSeconds / 3600)}시간 전`;
  if (elapsedSeconds < 60 * 60 * 24 * 7) return `${Math.floor(elapsedSeconds / 86400)}일 전`;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/** 등록일 또는 변경일을 게시물 카드에서 짧은 경과시간으로 표시합니다. */
export function formatRecipeTimestamp(createdAt?: string | null, updatedAt?: string | null): string | null {
  const updated = parseRecipeDate(updatedAt);
  const created = parseRecipeDate(createdAt);
  const timestamp = updated ?? created;
  if (!timestamp) return null;

  return `${updated ? '수정' : '등록'} ${formatRelativeTime(timestamp)}`;
}
