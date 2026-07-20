import {
  buildInlineDiceToken,
  parseInlineDiceTokenToConfig,
} from "@/lib/inline-dice";

import type { InlineDiceConfiguratorState } from "@/lib/inline-dice";

export const INLINE_DICE_RECENTS_STORAGE_KEY = "hqcc.inlineDiceRecents";
const MAX_INLINE_DICE_RECENTS = 5;

export type InlineDiceRecentEntry = InlineDiceConfiguratorState & {
  token: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecentEntry(value: unknown): value is InlineDiceRecentEntry {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.token === "string" &&
    typeof value.type === "string" &&
    "faceOrValue" in value &&
    typeof value.backgroundColor === "string" &&
    typeof value.symbolColor === "string"
  );
}

export function loadInlineDiceRecents(): InlineDiceRecentEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(INLINE_DICE_RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!isRecentEntry(entry)) return null;
        const restored = parseInlineDiceTokenToConfig(entry.token);
        if (!restored) return null;
        return {
          token: entry.token,
          ...restored,
        };
      })
      .filter((entry): entry is InlineDiceRecentEntry => entry !== null)
      .slice(0, MAX_INLINE_DICE_RECENTS);
  } catch {
    return [];
  }
}

export function saveInlineDiceRecents(entries: InlineDiceRecentEntry[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      INLINE_DICE_RECENTS_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_INLINE_DICE_RECENTS)),
    );
  } catch {
    // Ignore storage errors.
  }
}

export function pushInlineDiceRecent(
  entries: InlineDiceRecentEntry[],
  config: InlineDiceConfiguratorState,
): InlineDiceRecentEntry[] {
  const token = buildInlineDiceToken(config);
  const nextEntry: InlineDiceRecentEntry = { token, ...config };
  const deduped = entries.filter((entry) => entry.token !== token);
  const next = [nextEntry, ...deduped].slice(0, MAX_INLINE_DICE_RECENTS);
  saveInlineDiceRecents(next);
  return next;
}
