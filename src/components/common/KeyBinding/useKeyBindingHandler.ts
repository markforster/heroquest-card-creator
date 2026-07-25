"use client";

import { useEffect } from "react";

import { matchesKeyBinding } from "./keyBindingUtils";
import type { KeyBindingCombo } from "./keyBindingUtils";

type UseKeyBindingHandlerArgs = {
  combo: KeyBindingCombo;
  onTrigger: () => void;
};

export function useKeyBindingHandler({ combo, onTrigger }: UseKeyBindingHandlerArgs) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!matchesKeyBinding(event, combo)) return;
      event.preventDefault();
      onTrigger();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo, onTrigger]);
}
