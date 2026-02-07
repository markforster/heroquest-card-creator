const STORAGE_KEY = "hqcc.statLabels";

const STAT_LABEL_KEYS = [
  "statsLabelAttack",
  "statsLabelDefend",
  "statsLabelMove",
  "statsLabelStartingPoints",
  "statsLabelHeroBody",
  "statsLabelHeroMind",
  "statsLabelMonsterBodyPoints",
  "statsLabelMonsterMindPoints",
  "statsLabelBody",
  "statsLabelMind",
] as const;

export type StatLabelKey = (typeof STAT_LABEL_KEYS)[number];

export type StatLabelOverrides = Record<StatLabelKey, string> & {
  statLabelsEnabled: boolean;
};

export const DEFAULT_STAT_LABELS: StatLabelOverrides = {
  statLabelsEnabled: false,
  statsLabelAttack: "",
  statsLabelDefend: "",
  statsLabelMove: "",
  statsLabelStartingPoints: "",
  statsLabelHeroBody: "",
  statsLabelHeroMind: "",
  statsLabelMonsterBodyPoints: "",
  statsLabelMonsterMindPoints: "",
  statsLabelBody: "",
  statsLabelMind: "",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeStatLabelValue(value: string): string {
  return value.trim();
}

export function normalizeStatLabelOverrides(raw: unknown): {
  value: StatLabelOverrides;
  changed: boolean;
} {
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

  const legacyBody = normalized.statsLabelBody;
  if (!normalized.statsLabelHeroBody && legacyBody) {
    normalized.statsLabelHeroBody = legacyBody;
    changed = true;
  }
  if (!normalized.statsLabelMonsterBodyPoints && legacyBody) {
    normalized.statsLabelMonsterBodyPoints = legacyBody;
    changed = true;
  }

  const legacyMind = normalized.statsLabelMind;
  if (!normalized.statsLabelHeroMind && legacyMind) {
    normalized.statsLabelHeroMind = legacyMind;
    changed = true;
  }
  if (!normalized.statsLabelMonsterMindPoints && legacyMind) {
    normalized.statsLabelMonsterMindPoints = legacyMind;
    changed = true;
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
  baseLabel: string,
  overrides: StatLabelOverrides,
): string {
  if (!overrides.statLabelsEnabled) {
    return baseLabel;
  }
  const overrideValue = overrides[key];
  if (overrideValue && overrideValue.trim().length > 0) {
    return overrideValue;
  }
  return baseLabel;
}
