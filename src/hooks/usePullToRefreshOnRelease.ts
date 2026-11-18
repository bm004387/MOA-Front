import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const PULL_TO_REFRESH_THRESHOLD = 64;
const PULL_TO_REFRESH_MIN_HOLD_MS = 500;

function usePullToRefreshOnRelease(onRefresh: () => void) {
  const dragStart = useRef({ atTop: false, offsetY: 0 });
  const pullStartedAt = useRef<number | null>(null);

  const updatePullState = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragStart.current.atTop) return;

    const pullDistance = dragStart.current.offsetY - event.nativeEvent.contentOffset.y;
    if (pullDistance >= PULL_TO_REFRESH_THRESHOLD) {
      if (pullStartedAt.current == null) pullStartedAt.current = Date.now();
      return;
    }

    pullStartedAt.current = null;
  }, []);

  const onScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentInset, contentOffset } = event.nativeEvent;
    const topOffset = -contentInset.top;

    pullStartedAt.current = null;
    dragStart.current = {
      atTop: contentOffset.y <= topOffset + 1,
      offsetY: contentOffset.y,
    };
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updatePullState(event);
  }, [updatePullState]);

  const onScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updatePullState(event);
    const releaseOffsetY = event.nativeEvent.contentOffset.y;
    const pullDistance = dragStart.current.offsetY - releaseOffsetY;
    const heldDuration = pullStartedAt.current == null ? 0 : Date.now() - pullStartedAt.current;
    const shouldRefresh = dragStart.current.atTop
      && pullDistance >= PULL_TO_REFRESH_THRESHOLD
      && heldDuration >= PULL_TO_REFRESH_MIN_HOLD_MS;

    pullStartedAt.current = null;
    dragStart.current = { atTop: false, offsetY: 0 };

    if (shouldRefresh) onRefresh();
  }, [onRefresh, updatePullState]);

  return { onScroll, onScrollBeginDrag, onScrollEndDrag };
}

export default usePullToRefreshOnRelease;
