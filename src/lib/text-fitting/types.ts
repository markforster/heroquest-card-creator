export type TextRole = "title" | "statHeading";

export type TextBounds = {
  width: number;
  height: number;
};

export type TextLayoutResult = {
  role: TextRole;
  lines: string[];
  fontSize: number;
  lineHeight?: number;
  ellipsis: boolean;
  overflow: boolean;
  strategyUsed: string;
};

export type TitlePreferences = {
  allowWrap?: boolean;
  minFontPercent?: number;
  twoLineMinPercent?: number;
  allowOverflow?: boolean;
  preferEllipsis?: boolean;
};

export type StatHeadingPreferences = {
  minFontPercent?: number;
  allowOverflow?: boolean;
  forceTwoLine?: boolean;
  preferEllipsis?: boolean;
};

export type PreferencesByRole = {
  title: TitlePreferences;
  statHeading: StatHeadingPreferences;
};
