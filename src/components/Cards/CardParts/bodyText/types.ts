import type { InlineDiceToken } from "@/lib/inline-dice";

export type InlineTextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  scale?: number;
};

export type TextRun = {
  text: string;
} & InlineTextStyle;

export type TextWrapToken = {
  kind: "text";
  text: string;
} & InlineTextStyle;

export type DiceWrapToken = {
  kind: "dice";
  dice: InlineDiceToken;
  width: number;
  renderSize: number;
};

export type BodyTextToken = TextWrapToken | DiceWrapToken;

export type TextAlignment = "left" | "center" | "right";

export type RowMetrics = { height: number; maxFontSize: number; baselineOffset: number };
export type LeaderLayout = {
  valueStartOffset: number;
  valueColumnWidth: number;
  leaderPadding: number;
};
export type ListRow = RowMetrics & {
  kind: "list";
  sourceLineIndex: number;
  marker?: string;
  markerEnd: number;
  contentOffset: number;
  tokens: BodyTextToken[];
  blocked: boolean;
};
export type TextLine =
  | (RowMetrics & { kind: "text"; tokens: BodyTextToken[]; align?: TextAlignment })
  | (RowMetrics & {
      kind: "leader";
      labelTokens: BodyTextToken[];
      valueTokens: BodyTextToken[];
      separator: string;
      leaderLayout?: LeaderLayout;
      align?: TextAlignment;
    })
  | (RowMetrics & {
      kind: "leader-continuation";
      valueTokens: BodyTextToken[];
      leaderLayout: LeaderLayout;
      align?: TextAlignment;
    })
  | ListRow
  | { kind: "paragraph-gap"; height: number };
export type CardTextLayout = {
  rows: TextLine[];
  lines: TextLine[];
  lineHeight: number;
  paragraphGap: number;
  totalHeight: number;
  horizontalOverflow?: boolean;
};
