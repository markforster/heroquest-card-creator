"use client";

import { useEffect } from "react";

import { useIsMac } from "./useIsMac";
import { useKeyBindingLabel } from "./useKeyBindingLabel";

type KeyBindingProps = {
  combo: {
    key: string;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    ctrl?: boolean;
  };
  onTrigger: () => void;
  label?: string;
  children: React.ReactNode;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

export default function KeyBinding({ combo, onTrigger, children, label }: KeyBindingProps) {
  const isMac = useIsMac();
  const tooltip = useKeyBindingLabel({ combo, isMac, label });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (combo.shift && !event.shiftKey) return;
      if (combo.alt && !event.altKey) return;
      if (combo.meta && !event.metaKey) return;
      if (combo.ctrl && !event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key !== combo.key.toLowerCase()) return;
      event.preventDefault();
      onTrigger();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo, onTrigger]);

  return (
    <span title={tooltip} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
