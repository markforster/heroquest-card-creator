"use client";

import { useEffect } from "react";

type UseEscapeKeyArgs = {
  enabled?: boolean;
  onEscape: () => void;
};

export function useEscapeKey({ enabled = true, onEscape }: UseEscapeKeyArgs) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onEscape();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onEscape]);
}
