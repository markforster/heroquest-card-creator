export type StatSplitFormat = "slash" | "paren" | "paren-leading";

export type StatValue =
  | number
  | [number, number]
  | [number, number, 0 | 1]
  | [number, number, 0 | 1, StatSplitFormat];
