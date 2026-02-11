import type { TextBounds, TextLayoutResult, TextRole } from "./types";
import { createTextMeasurer } from "./measure";

export type StrategyContext = {
  role: TextRole;
  text: string;
  bounds: TextBounds;
  fontSize: number;
  lineHeight: number;
  lines: string[];
  fontFamily: string;
  fontWeight?: number | string;
  minFontPercent?: number;
  twoLineMinPercent?: number;
  allowWrap?: boolean;
  forceTwoLine?: boolean;
};

export type StrategyResult = {
  success: boolean;
  layout: TextLayoutResult;
};

export function wrapStrategy(ctx: StrategyContext): StrategyResult {
  if (ctx.role === "title") {
    // Title wrap temporarily disabled.
    return {
      success: false,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "wrap-title-disabled",
      },
    };

  }

  if (ctx.role === "statHeading") {
    const measure = createTextMeasurer(ctx.fontSize, ctx.fontFamily, ctx.fontWeight);
    const words = ctx.text.split(" ");
    const lines: string[] = [];

    const lineHeight = ctx.lineHeight;
    const canUseTwoLines = lineHeight * 2 <= ctx.bounds.height;
    if (ctx.forceTwoLine && canUseTwoLines && words.length >= 2) {
      let bestIndex = -1;
      let bestScore = Number.POSITIVE_INFINITY;
      for (let i = 1; i < words.length; i += 1) {
        const left = words.slice(0, i).join(" ");
        const right = words.slice(i).join(" ");
        const leftWidth = measure(left);
        const rightWidth = measure(right);
        if (leftWidth <= ctx.bounds.width && rightWidth <= ctx.bounds.width) {
          const score = Math.max(leftWidth, rightWidth);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
      }
      if (bestIndex > 0) {
        const left = words.slice(0, bestIndex).join(" ");
        const right = words.slice(bestIndex).join(" ");
        return {
          success: true,
          layout: {
            role: ctx.role,
            lines: [left, right],
            fontSize: ctx.fontSize,
            lineHeight: ctx.lineHeight,
            ellipsis: false,
            overflow: false,
            strategyUsed: "wrap-two-line",
          },
        };
      }
    }

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = measure(candidate);

      if (!current || candidateWidth <= ctx.bounds.width) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return {
      success: true,
      layout: {
        role: ctx.role,
        lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "wrap-measured",
      },
    };
  }

  return {
    success: true,
    layout: {
      role: ctx.role,
      lines: ctx.lines,
      fontSize: ctx.fontSize,
      lineHeight: ctx.lineHeight,
      ellipsis: false,
      overflow: false,
      strategyUsed: "wrap-noop",
    },
  };
}

export function shrinkStrategy(ctx: StrategyContext): StrategyResult {
  if (!ctx.text) {
    return {
      success: true,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "shrink-skip-empty",
      },
    };
  }

  const minPercent = ctx.minFontPercent ?? 80;
  const minFontSize = Math.max(1, Math.floor((ctx.fontSize * minPercent) / 100));
  const measure = createTextMeasurer(ctx.fontSize, ctx.fontFamily, ctx.fontWeight);
  const widthAtCurrent = measure(ctx.text);
  const heightAtCurrent = ctx.lineHeight;
  const fitsAtCurrent = widthAtCurrent <= ctx.bounds.width && heightAtCurrent <= ctx.bounds.height;

  if (fitsAtCurrent) {
    return {
      success: true,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "shrink-skip-fit",
      },
    };
  }

  const widthScale = ctx.bounds.width / widthAtCurrent;
  const heightScale = ctx.bounds.height / heightAtCurrent;
  const scale = Math.min(1, widthScale, heightScale);
  const nextFontSize = Math.max(minFontSize, Math.floor(ctx.fontSize * scale));
  const nextLineHeight = ctx.lineHeight * (nextFontSize / ctx.fontSize);
  const nextMeasure = createTextMeasurer(nextFontSize, ctx.fontFamily, ctx.fontWeight);
  const widthAtNext = nextMeasure(ctx.text);
  const fitsAtNext = widthAtNext <= ctx.bounds.width && nextLineHeight <= ctx.bounds.height;

  return {
    success: fitsAtNext,
    layout: {
      role: ctx.role,
      lines: ctx.lines,
      fontSize: nextFontSize,
      lineHeight: nextLineHeight,
      ellipsis: false,
      overflow: false,
      strategyUsed: "shrink",
    },
  };
}

export function hyphenateStrategy(ctx: StrategyContext): StrategyResult {
  if (ctx.role === "statHeading") {
    const measure = createTextMeasurer(ctx.fontSize, ctx.fontFamily, ctx.fontWeight);
    const maxWidth = ctx.bounds.width;
    const hyphen = "-";
    const hyphenWidth = measure(hyphen);
    const tokens = ctx.lines.flatMap((line) => line.split(" "));
    const lines: string[] = [];
    let current = "";

    const pushLine = (line: string) => {
      if (line) lines.push(line);
    };

    for (const token of tokens) {
      if (!token) continue;
      const tokenWidth = measure(token);

      if (tokenWidth + (current ? measure(current) : 0) <= maxWidth) {
        current = current ? `${current} ${token}` : token;
        continue;
      }

      if (tokenWidth <= maxWidth) {
        pushLine(current);
        current = token;
        continue;
      }

      // Try a balanced two-line split first.
      const balanced = (() => {
        let bestIndex = -1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let i = 1; i < token.length; i += 1) {
          const left = token.slice(0, i);
          const right = token.slice(i);
          const leftWidth = measure(left) + hyphenWidth;
          const rightWidth = measure(right);
          if (leftWidth > maxWidth || rightWidth > maxWidth) continue;
          const score = Math.max(leftWidth, rightWidth);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
        if (bestIndex <= 0) return null;
        return {
          left: `${token.slice(0, bestIndex)}${hyphen}`,
          right: token.slice(bestIndex),
        };
      })();

      if (balanced) {
        pushLine(current);
        lines.push(balanced.left);
        current = balanced.right;
        continue;
      }

      // Token is too long: hard split with hyphenation.
      let start = 0;
      while (start < token.length) {
        let end = token.length;
        let best = "";

        // Find the longest substring that fits with a hyphen (if not last chunk).
        for (let i = start + 1; i <= token.length; i += 1) {
          const chunk = token.slice(start, i);
          const isLast = i >= token.length;
          const width = measure(chunk) + (isLast ? 0 : hyphenWidth);
          if (width <= maxWidth) {
            best = chunk;
          } else {
            break;
          }
        }

        if (!best) {
          // Nothing fits; fall back to single character to avoid infinite loop.
          best = token.slice(start, start + 1);
        }

        const isLast = start + best.length >= token.length;
        const chunkText = isLast ? best : `${best}${hyphen}`;
        pushLine(current);
        current = chunkText;
        start += best.length;
      }
    }

    if (current) lines.push(current);

    return {
      success: true,
      layout: {
        role: ctx.role,
        lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "hyphenate",
      },
    };
  }

  return {
    success: true,
    layout: {
      role: ctx.role,
      lines: ctx.lines,
      fontSize: ctx.fontSize,
      lineHeight: ctx.lineHeight,
      ellipsis: false,
      overflow: false,
      strategyUsed: "hyphenate-noop",
    },
  };
}

export function ellipsisStrategy(ctx: StrategyContext): StrategyResult {
  if (!ctx.text) {
    return {
      success: false,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "ellipsis-skip-empty",
      },
    };
  }

  const measure = createTextMeasurer(ctx.fontSize, ctx.fontFamily, ctx.fontWeight);
  const maxWidth = ctx.bounds.width;
  const ellipsisChar = "…";

  const fullWidth = measure(ctx.text);
  if (fullWidth <= maxWidth) {
    return {
      success: false,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "ellipsis-skip-fit",
      },
    };
  }

  const ellipsisWidth = measure(ellipsisChar);
  if (ellipsisWidth > maxWidth) {
    return {
      success: false,
      layout: {
        role: ctx.role,
        lines: ctx.lines,
        fontSize: ctx.fontSize,
        lineHeight: ctx.lineHeight,
        ellipsis: false,
        overflow: false,
        strategyUsed: "ellipsis-skip-too-narrow",
      },
    };
  }

  let low = 0;
  let high = ctx.text.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = ctx.text.slice(0, mid);
    const candidateWidth = measure(candidate) + ellipsisWidth;

    if (candidateWidth <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const truncated = `${best}${ellipsisChar}`;
  return {
    success: true,
    layout: {
      role: ctx.role,
      lines: [truncated],
      fontSize: ctx.fontSize,
      lineHeight: ctx.lineHeight,
      ellipsis: true,
      overflow: false,
      strategyUsed: "ellipsis",
    },
  };
}

export function ellipsisStrategyNoop(ctx: StrategyContext): StrategyResult {
  return {
    success: true,
    layout: {
      role: ctx.role,
      lines: ctx.lines,
      fontSize: ctx.fontSize,
      lineHeight: ctx.lineHeight,
      ellipsis: false,
      overflow: false,
      strategyUsed: "ellipsis-noop",
    },
  };
}

export function overflowStrategy(ctx: StrategyContext): StrategyResult {
  return {
    success: true,
    layout: {
      role: ctx.role,
      lines: ctx.lines,
      fontSize: ctx.fontSize,
      lineHeight: ctx.lineHeight,
      ellipsis: false,
      overflow: true,
      strategyUsed: "overflow",
    },
  };
}
