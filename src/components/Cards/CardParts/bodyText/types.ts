import type { InlineDiceToken } from "@/lib/inline-dice";

export type InlineTextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
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
