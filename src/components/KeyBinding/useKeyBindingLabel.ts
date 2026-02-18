"use client";

import { useMemo } from "react";

type Combo = {
  key: string;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  ctrl?: boolean;
};

type UseKeyBindingLabelArgs = {
  combo: Combo;
  isMac: boolean;
  label?: string;
};

export function useKeyBindingLabel({ combo, isMac, label }: UseKeyBindingLabelArgs) {
  return useMemo(() => {
    const parts: string[] = [];
    if (combo.meta) parts.push(isMac ? "Cmd" : "Meta");
    if (combo.ctrl) parts.push("Ctrl");
    if (combo.alt) parts.push(isMac ? "Option" : "Alt");
    if (combo.shift) parts.push("Shift");
    parts.push(combo.key.toUpperCase());
    const shortcut = parts.join("+");
    return label ? `${shortcut} - ${label}` : shortcut;
  }, [combo, isMac, label]);
}
