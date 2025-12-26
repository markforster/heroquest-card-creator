const STORAGE_KEY = "hqcc.statLabels";

export const STAT_LABEL_KEYS = [
  "statsLabelAttack",
  "statsLabelDefend",
  "statsLabelBody",
  "statsLabelMind",
  "statsLabelMove",
  "statsLabelStartingPoints",
] as const;

export type StatLabelKey = (typeof STAT_LABEL_KEYS)[number];

export type StatLabelOverrides = Record<StatLabelKey, string> & {
  statLabelsEnabled: boolean;
};

export const DEFAULT_STAT_LABELS: StatLabelOverrides = {
  statLabelsEnabled: false,
  statsLabelAttack: "",
  statsLabelDefend: "",
  statsLabelBody: "",
  statsLabelMind: "",
  statsLabelMove: "",
  statsLabelStartingPoints: "",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeStatLabelValue(value: string): string {
  return value.trim();
}

export function normalizeStatLabelOverrides(
  raw: unknown,
): { value: StatLabelOverrides; changed: boolean } {
  const normalized: StatLabelOverrides = { ...DEFAULT_STAT_LABELS };
  let changed = false;

  if (!isPlainObject(raw)) {
    return { value: normalized, changed: true };
  }

  const enabled = raw.statLabelsEnabled;
  if (typeof enabled === "boolean") {
    normalized.statLabelsEnabled = enabled;
  } else if ("statLabelsEnabled" in raw) {
    changed = true;
  }

  for (const key of STAT_LABEL_KEYS) {
    const value = raw[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      normalized[key] = trimmed;
      if (trimmed !== value) {
        changed = true;
      }
    } else if (key in raw) {
      changed = true;
    } else {
      changed = true;
    }
  }

  return { value: normalized, changed };
}

export function loadStatLabelOverrides(): StatLabelOverrides {
  if (typeof window === "undefined") {
    return DEFAULT_STAT_LABELS;
  }

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_STAT_LABELS;
  }

  if (!stored) {
    saveStatLabelOverrides(DEFAULT_STAT_LABELS);
    return DEFAULT_STAT_LABELS;
  }

  try {
    const parsed = JSON.parse(stored);
    const { value, changed } = normalizeStatLabelOverrides(parsed);
    if (changed) {
      saveStatLabelOverrides(value);
    }
    return value;
  } catch {
    saveStatLabelOverrides(DEFAULT_STAT_LABELS);
    return DEFAULT_STAT_LABELS;
  }
}

export function saveStatLabelOverrides(value: StatLabelOverrides): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write errors.
  }
}

export function getStatLabel(
  key: StatLabelKey,
  t: (key: string) => string,
  overrides: StatLabelOverrides,
): string {
  if (!overrides.statLabelsEnabled) {
    return t(key);
  }
  const overrideValue = overrides[key];
  if (overrideValue && overrideValue.trim().length > 0) {
    return overrideValue;
  }
  return t(key);
}
