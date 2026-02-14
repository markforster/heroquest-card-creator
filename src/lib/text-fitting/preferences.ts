import type { PreferencesByRole, TextRole, TitlePreferences, StatHeadingPreferences } from "./types";
import { ROLE_CONFIG } from "./roleConfig";

const STORAGE_KEYS: Record<TextRole, string> = {
  title: "hqcc.titleFittingPrefs",
  statHeading: "hqcc.statHeadingFittingPrefs",
};

function clampPercent(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sanitizeTitlePrefs(input: Partial<TitlePreferences>): TitlePreferences {
  const next: TitlePreferences = {};
  if (typeof input.allowWrap === "boolean") next.allowWrap = input.allowWrap;
  if (typeof input.minFontPercent === "number") {
    next.minFontPercent = clampPercent(input.minFontPercent, 50, 100);
  }
  if (typeof input.twoLineMinPercent === "number") {
    next.twoLineMinPercent = clampPercent(input.twoLineMinPercent, 50, 100);
  }
  if (typeof input.allowOverflow === "boolean") next.allowOverflow = input.allowOverflow;
  if (typeof input.preferEllipsis === "boolean") next.preferEllipsis = input.preferEllipsis;
  return next;
}

function sanitizeStatHeadingPrefs(input: Partial<StatHeadingPreferences>): StatHeadingPreferences {
  const next: StatHeadingPreferences = {};
  if (typeof input.minFontPercent === "number") {
    next.minFontPercent = clampPercent(input.minFontPercent, 50, 100);
  }
  if (typeof input.allowOverflow === "boolean") next.allowOverflow = input.allowOverflow;
  if (typeof input.forceTwoLine === "boolean") next.forceTwoLine = input.forceTwoLine;
  if (typeof input.preferEllipsis === "boolean") next.preferEllipsis = input.preferEllipsis;
  return next;
}

export function getTextFittingPreferences(role: TextRole): PreferencesByRole[TextRole] {
  const defaults = ROLE_CONFIG[role].defaultPreferences;
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[role]);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PreferencesByRole[TextRole]>;
    if (role === "title") {
      return { ...defaults, ...sanitizeTitlePrefs(parsed as Partial<TitlePreferences>) };
    }
    return { ...defaults, ...sanitizeStatHeadingPrefs(parsed as Partial<StatHeadingPreferences>) };
  } catch {
    return defaults;
  }
}

export function getDefaultTextFittingPreferences(role: TextRole): PreferencesByRole[TextRole] {
  return ROLE_CONFIG[role].defaultPreferences;
}

export function mergeTextFittingPreferences(
  role: TextRole,
  base: PreferencesByRole[TextRole],
  updates: Partial<PreferencesByRole[TextRole]>,
): PreferencesByRole[TextRole] {
  if (role === "title") {
    return { ...base, ...sanitizeTitlePrefs({ ...(base as TitlePreferences), ...(updates as TitlePreferences) }) };
  }
  return {
    ...base,
    ...sanitizeStatHeadingPrefs({ ...(base as StatHeadingPreferences), ...(updates as StatHeadingPreferences) }),
  };
}

export function storeTextFittingPreferences(role: TextRole, prefs: PreferencesByRole[TextRole]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(prefs));
  } catch {
    // Ignore localStorage errors.
  }
}
