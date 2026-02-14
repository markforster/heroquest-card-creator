"use client";

import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { createTextMeasurer } from "@/lib/text-fitting/measure";
import { runsToTokens, wrapTokens } from "@/lib/text-fitting/wrap";

import type { CSSProperties } from "react";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CardTextBlockProps = {
  text?: string | null;
  bounds: Bounds;
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  fill?: string;
  letterSpacingEm?: number;
  align?: "left" | "center" | "right";
};

const CARD_BODY_LINE_HEIGHT = 1.05;

type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type TextLine =
  | { kind: "text"; runs: TextRun[]; align?: "left" | "center" | "right" }
  | {
      kind: "leader";
      labelRuns: TextRun[];
      valueRuns: TextRun[];
      separator: string;
      align?: "left" | "center" | "right";
    };

export type CardTextLayout = {
  lines: TextLine[];
  lineHeight: number;
};

export function layoutCardText({
  text,
  width,
  fontSize = 22,
  lineHeight,
  fontFamily = CARD_TEXT_FONT_FAMILY,
  defaultAlign = "left",
}: {
  text?: string | null;
  width: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  defaultAlign?: "left" | "center" | "right";
}): CardTextLayout {
  const effectiveLineHeight = lineHeight ?? fontSize * CARD_BODY_LINE_HEIGHT;

  if (!text || !text.trim()) {
    return { lines: [], lineHeight: effectiveLineHeight };
  }

  const logicalLines = text.split(/\r?\n/);
  const visualLines: TextLine[] = [];
  let currentAlign: "left" | "center" | "right" = defaultAlign;

  const measure = createTextMeasurer(fontSize, fontFamily);
  const safeWidth = Math.max(0, width - fontSize * 0.4);

  const pushAlignedLine = (lineText: string, align: "left" | "center" | "right") => {
    // Preserve intentional blank lines (including lines with only whitespace) as visual gaps.
    if (lineText.trim() === "") {
      visualLines.push({ kind: "text", runs: [{ text: "" }], align });
      return;
    }

    // Leader lines: [label[sep]value]
    const leaderMatch = lineText.match(/^\[(.+?)\[(.*?)\](.+?)\]$/);
    if (leaderMatch) {
      const labelRaw = leaderMatch[1];
      const sepRaw = leaderMatch[2];
      const valueRaw = leaderMatch[3];

      const separator = sepRaw || ".";
      const labelRuns = parseInlineMarkdown(labelRaw);
      const valueRuns = parseInlineMarkdown(valueRaw);

      visualLines.push({
        kind: "leader",
        labelRuns,
        valueRuns,
        separator,
        align,
      });
      return;
    }

    const runs = parseInlineMarkdown(lineText);
    const tokens = runsToTokens(runs);
    const wrapped = wrapTokens(tokens, safeWidth, measure);
    wrapped.forEach((lineRuns) => {
      visualLines.push({ kind: "text", runs: lineRuns, align });
    });
  };

  let inlineAlign: "left" | "center" | "right" | null = null;

  for (const logicalLine of logicalLines) {
    if (inlineAlign) {
      const closeIndex = logicalLine.indexOf(":::");
      if (closeIndex >= 0) {
        const beforeClose = logicalLine.slice(0, closeIndex);
        const afterClose = logicalLine.slice(closeIndex + 3);
        pushAlignedLine(beforeClose, inlineAlign);
        inlineAlign = null;
        if (afterClose.trim() !== "") {
          pushAlignedLine(afterClose, currentAlign);
        }
      } else {
        pushAlignedLine(logicalLine, inlineAlign);
      }
      continue;
    }

    const directive = parseAlignmentDirective(logicalLine);
    if (directive) {
      currentAlign = directive === "reset" ? defaultAlign : directive;
      continue;
    }

    const inlineDirective = parseInlineAlignmentStart(logicalLine);
    if (inlineDirective) {
      pushAlignedLine(inlineDirective.text, inlineDirective.align);
      if (!inlineDirective.closed) {
        inlineAlign = inlineDirective.align;
      } else if (inlineDirective.trailing.trim() !== "") {
        pushAlignedLine(inlineDirective.trailing, currentAlign);
      }
      continue;
    }

    pushAlignedLine(logicalLine, currentAlign);
  }

  return { lines: visualLines, lineHeight: effectiveLineHeight };
}

export default function CardTextBlock({
  text,
  bounds,
  fontSize = 22,
  lineHeight,
  fontWeight,
  fontFamily = CARD_TEXT_FONT_FAMILY,
  fill = "#111111",
  letterSpacingEm,
  align = "left",
}: CardTextBlockProps) {
  const { lines, lineHeight: effectiveLineHeight } = layoutCardText({
    text,
    width: bounds.width,
    fontSize,
    lineHeight,
    fontFamily,
    defaultAlign: align,
  });

  if (lines.length === 0) {
    return null;
  }

  const maxLines = Math.max(1, Math.floor(bounds.height / effectiveLineHeight));
  const clippedLines = lines.slice(0, maxLines);

  const textStyle: CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing: letterSpacingEm != null ? `${letterSpacingEm}em` : undefined,
  };

  const measure = createTextMeasurer(fontSize, fontFamily);

  return (
    <text x={bounds.x} y={bounds.y + fontSize} fill={fill} style={textStyle}>
      {clippedLines.flatMap((line, lineIndex) => {
        const lineY = bounds.y + fontSize + effectiveLineHeight * lineIndex;

        if (line.kind === "text") {
          const lineAlign = line.align ?? align;
          const anchor: "start" | "middle" | "end" =
            lineAlign === "center" ? "middle" : lineAlign === "right" ? "end" : "start";
          const originX =
            lineAlign === "center"
              ? bounds.x + bounds.width / 2
              : lineAlign === "right"
                ? bounds.x + bounds.width
                : bounds.x;

          return line.runs.map((run, runIndex) => {
            const isFirstRunOfLine = runIndex === 0;

            const tspanProps: {
              x?: number;
              y?: number;
              fontWeight?: string;
              fontStyle?: string;
              textAnchor?: "start" | "middle" | "end";
            } = {};

            if (isFirstRunOfLine) {
              tspanProps.x = originX;
              tspanProps.y = lineY;
            }
            tspanProps.textAnchor = anchor;

            if (run.bold) {
              tspanProps.fontWeight = "700";
            }
            if (run.italic) {
              tspanProps.fontStyle = "italic";
            }

            return (
              <tspan key={`${lineIndex}-run-${runIndex}`} {...tspanProps}>
                {run.text}
              </tspan>
            );
          });
        }

        // Leader line rendering
        const leaderPadding = fontSize * 0.25;
        const leftX = bounds.x;
        const rightX = bounds.x + bounds.width;

        const measureRunsWidth = (runsToMeasure: TextRun[]): number =>
          runsToMeasure.reduce((sum, r) => sum + measure(r.text), 0);

        const labelWidth = measureRunsWidth(line.labelRuns);
        const valueWidth = measureRunsWidth(line.valueRuns);

        const labelStartX = leftX;
        const valueEndX = rightX;
        const valueStartX = valueEndX - valueWidth;

        const gapStartX = labelStartX + labelWidth + leaderPadding;
        const gapEndX = valueStartX - leaderPadding;
        const availableGapWidth = Math.max(0, gapEndX - gapStartX);

        const sepChar = line.separator || ".";
        const sepWidth = measure(sepChar);
        const sepCount =
          sepWidth > 0 ? Math.max(0, Math.floor(availableGapWidth / sepWidth)) : 0;
        const sepText = sepCount > 0 ? sepChar.repeat(sepCount) : "";

        const tspans: JSX.Element[] = [];

        // Label runs
        line.labelRuns.forEach((run, runIndex) => {
          const tspanProps: {
            key: string;
            x?: number;
            y?: number;
            fontWeight?: string;
            fontStyle?: string;
          } = {
            key: `${lineIndex}-label-${runIndex}`,
          };

          if (runIndex === 0) {
            tspanProps.x = labelStartX;
            tspanProps.y = lineY;
          }
          if (run.bold) tspanProps.fontWeight = "700";
          if (run.italic) tspanProps.fontStyle = "italic";

          tspans.push(<tspan {...tspanProps}>{run.text}</tspan>);
        });

        // Separator
        if (sepText) {
          tspans.push(
            <tspan key={`${lineIndex}-sep`} x={gapStartX} y={lineY}>
              {sepText}
            </tspan>,
          );
        }

        // Value runs, right-aligned by starting at valueStartX
        line.valueRuns.forEach((run, runIndex) => {
          const tspanProps: {
            key: string;
            x?: number;
            y?: number;
            fontWeight?: string;
            fontStyle?: string;
          } = {
            key: `${lineIndex}-value-${runIndex}`,
          };

          if (runIndex === 0) {
            tspanProps.x = valueStartX;
            tspanProps.y = lineY;
          }
          if (run.bold) tspanProps.fontWeight = "700";
          if (run.italic) tspanProps.fontStyle = "italic";

          tspans.push(<tspan {...tspanProps}>{run.text}</tspan>);
        });

        return tspans;
      })}
    </text>
  );
}

function parseAlignmentDirective(line: string): "left" | "center" | "right" | "reset" | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed === ":::") return "reset";

  return getAlignmentToken(trimmed);
}

function parseInlineAlignmentStart(line: string): {
  align: "left" | "center" | "right";
  text: string;
  trailing: string;
  closed: boolean;
} | null {
  const match = line.match(/^\s*:::(\S+)\s*(.*)$/);
  if (!match) return null;
  const alignToken = `:::${match[1]}`;
  const align = getAlignmentToken(alignToken);
  if (!align) return null;

  const remainder = match[2];
  const closeIndex = remainder.indexOf(":::");
  if (closeIndex >= 0) {
    const text = remainder.slice(0, closeIndex);
    const trailing = remainder.slice(closeIndex + 3);
    return { align, text, trailing, closed: true };
  }

  return { align, text: remainder, trailing: "", closed: false };
}

function getAlignmentToken(token: string): "left" | "center" | "right" | null {
  const lookup: Record<string, "left" | "center" | "right"> = {
    ":::align_center": "center",
    ":::align_c": "center",
    ":::ac": "center",
    ":::align_left": "left",
    ":::align_l": "left",
    ":::al": "left",
    ":::align_right": "right",
    ":::align_r": "right",
    ":::ar": "right",
  };

  return lookup[token] ?? null;
}

function parseInlineMarkdown(line: string): TextRun[] {
  const runs: TextRun[] = [];

  // Match either **bold** or *italic* segments where:
  // - There is at least one non-space character inside.
  // - The first and last characters inside are not spaces.
  // Everything else (including stray *) is treated as plain text.
  const pattern = /\*\*(\S(?:[\s\S]*?\S)?)\*\*|\*(\S(?:[\s\S]*?\S)?)\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushRun = (text: string, bold?: boolean, italic?: boolean) => {
    if (!text) return;
    runs.push({ text, bold, italic });
  };

  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(line)) !== null) {
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      pushRun(line.slice(lastIndex, matchStart));
    }

    const boldText = match[1];
    const italicText = match[2];

    if (boldText != null) {
      pushRun(boldText, true, false);
    } else if (italicText != null) {
      pushRun(italicText, false, true);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < line.length) {
    pushRun(line.slice(lastIndex));
  }

  return runs;
}

// createTextMeasurer moved to shared lib for reuse.
