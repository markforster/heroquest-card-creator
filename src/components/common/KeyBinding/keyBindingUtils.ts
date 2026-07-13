"use client";

export type KeyBindingCombo = {
  key: string;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  ctrl?: boolean;
};

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

export const matchesKeyBinding = (event: KeyboardEvent, combo: KeyBindingCombo) => {
  if (event.repeat) return false;
  if (isEditableTarget(event.target)) return false;
  if (Boolean(combo.shift) !== event.shiftKey) return false;
  if (Boolean(combo.alt) !== event.altKey) return false;
  if (Boolean(combo.meta) !== event.metaKey) return false;
  if (Boolean(combo.ctrl) !== event.ctrlKey) return false;
  return event.key.toLowerCase() === combo.key.toLowerCase();
};
