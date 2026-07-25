"use client";

import { useEffect, type RefObject } from "react";

type OutsideClickRef = RefObject<HTMLElement | null> | { current: HTMLElement | null };
type OutsideClickRefs = OutsideClickRef[];

export function useOutsideClick(
  refs: OutsideClickRefs,
  onOutsideClick: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) {
        return;
      }
      onOutsideClick();
    };
    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, [enabled, onOutsideClick, refs]);
}
