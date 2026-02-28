"use client";

import { COLLAPSE_MEDIA_QUERY, NAV_COLLAPSE_STORAGE_KEY } from "./consts";
import { useLeftNavCollapsedState } from "./useLeftNavCollapsedState";
import { useMediaQuery } from "./useMediaQuery";

export function useLeftNavCollapse() {
  const autoCollapsed = useMediaQuery(COLLAPSE_MEDIA_QUERY);
  const { manualCollapsed, setManualCollapsed, isCollapsedReady } =
    useLeftNavCollapsedState(NAV_COLLAPSE_STORAGE_KEY);
  const isCollapsed = autoCollapsed || manualCollapsed;

  return { isCollapsed, setManualCollapsed, isCollapsedReady };
}
