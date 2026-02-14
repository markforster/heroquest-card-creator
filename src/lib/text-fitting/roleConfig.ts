import type { PreferencesByRole, TextRole } from "./types";

export type StrategyId = "wrap" | "shrink" | "hyphenate" | "ellipsis" | "overflow";

export type RoleConfig = {
  role: TextRole;
  defaultStrategies: StrategyId[];
  defaultPreferences: PreferencesByRole[TextRole];
};

export const TITLE_DEFAULT_STRATEGIES: StrategyId[] = ["shrink", "ellipsis", "overflow"];
export const STAT_HEADING_DEFAULT_STRATEGIES: StrategyId[] = [
  "wrap",
  "shrink",
  "hyphenate",
  "ellipsis",
  "overflow",
];

export const ROLE_CONFIG: Record<TextRole, RoleConfig> = {
  title: {
    role: "title",
    defaultStrategies: TITLE_DEFAULT_STRATEGIES,
    defaultPreferences: {
      allowWrap: false,
      minFontPercent: 75,
      twoLineMinPercent: 85,
      allowOverflow: false,
      preferEllipsis: false,
    },
  },
  statHeading: {
    role: "statHeading",
    defaultStrategies: STAT_HEADING_DEFAULT_STRATEGIES,
    defaultPreferences: {
      minFontPercent: 95,
      allowOverflow: false,
      forceTwoLine: true,
      preferEllipsis: false,
    },
  },
};
