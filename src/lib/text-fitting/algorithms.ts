import type { TextBounds, TextLayoutResult } from "./types";
import { wrapHeaderLinesApprox } from "./legacy";

const TITLE_FONT_SIZE = 54;
const TITLE_LINE_HEIGHT = TITLE_FONT_SIZE * 1.05;
const STAT_HEADER_FONT_SIZE = 22;
const STAT_HEADER_LINE_HEIGHT = STAT_HEADER_FONT_SIZE * 1.05;

export function titleAlgorithm(text: string): TextLayoutResult {
  return {
    role: "title",
    lines: [text],
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    ellipsis: false,
    overflow: false,
    strategyUsed: "legacy-title",
  };
}

export function statHeadingAlgorithm(text: string, bounds: TextBounds): TextLayoutResult {
  const lines = wrapHeaderLinesApprox(text, bounds.width, STAT_HEADER_FONT_SIZE);
  return {
    role: "statHeading",
    lines,
    fontSize: STAT_HEADER_FONT_SIZE,
    lineHeight: STAT_HEADER_LINE_HEIGHT,
    ellipsis: false,
    overflow: false,
    strategyUsed: "legacy-stat-heading-wrap",
  };
}
