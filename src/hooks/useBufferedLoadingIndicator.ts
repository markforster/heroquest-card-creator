"use client";

import { useEffect, useRef, useState } from "react";

type BufferedLoadingIndicatorOptions = {
  showDelayMs?: number;
  minVisibleMs?: number;
};

const DEFAULT_SHOW_DELAY_MS = 150;
const DEFAULT_MIN_VISIBLE_MS = 400;

export default function useBufferedLoadingIndicator(
  rawLoading: boolean,
  options: BufferedLoadingIndicatorOptions = {},
): boolean {
  const showDelayMs = options.showDelayMs ?? DEFAULT_SHOW_DELAY_MS;
  const minVisibleMs = options.minVisibleMs ?? DEFAULT_MIN_VISIBLE_MS;
  const [showIndicator, setShowIndicator] = useState(false);
  const visibleSinceRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (rawLoading) {
      if (showIndicator) {
        return;
      }
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        visibleSinceRef.current = Date.now();
        setShowIndicator(true);
      }, showDelayMs);
      return;
    }

    if (!showIndicator) {
      visibleSinceRef.current = null;
      return;
    }

    const visibleSince = visibleSinceRef.current;
    if (visibleSince == null) {
      setShowIndicator(false);
      return;
    }

    const elapsed = Date.now() - visibleSince;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    if (remaining === 0) {
      visibleSinceRef.current = null;
      setShowIndicator(false);
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      visibleSinceRef.current = null;
      setShowIndicator(false);
    }, remaining);
  }, [minVisibleMs, rawLoading, showDelayMs, showIndicator]);

  return showIndicator;
}
