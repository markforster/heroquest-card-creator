"use client";

import { useId } from "react";

import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { createTextMeasurer } from "@/lib/text-fitting/measure";
import { runsToTokens, wrapTokens, type WrapToken } from "@/lib/text-fitting/wrap";
import {
  tokenizeInlineDice,
  type InlineDiceSegment,
} from "@/lib/inline-dice";

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
const DICE_SIZE_RATIO = 1.18;
const DICE_TEXT_GAP_RATIO = 0.14;
const DICE_TEXT_GAP_PX = 2;
const DICE_CORNER_RADIUS_RATIO = 0.22;
const DICE_ICON_PADDING_RATIO = 0.08;
const DICE_TEXT_CENTER_RATIO = 0.5;
const DICE_Y_OFFSET_PX = 6;
const DICE_FACE_COLOR = "#111111";
const DICE_BG_COLOR = "#ffffff";
const DICE_BORDER_COLOR = "#111111";
const DICE_BORDER_WIDTH = 1;

type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type TextLine =
  | { kind: "text"; tokens: WrapToken[]; align?: "left" | "center" | "right" }
  | {
      kind: "leader";
      labelTokens: WrapToken[];
      valueTokens: WrapToken[];
      separator: string;
      align?: "left" | "center" | "right";
    };

export type CardTextLayout = {
  lines: TextLine[];
  lineHeight: number;
};

type TextToken = WrapToken;

export function layoutCardText({
  text,
  width,
  fontSize = 22,
  lineHeight,
  fontFamily = CARD_TEXT_FONT_FAMILY,
  fontWeight,
  letterSpacingEm,
  defaultAlign = "left",
}: {
  text?: string | null;
  width: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacingEm?: number;
  defaultAlign?: "left" | "center" | "right";
}): CardTextLayout {
  const effectiveLineHeight = lineHeight ?? fontSize * CARD_BODY_LINE_HEIGHT;

  if (!text || !text.trim()) {
    return { lines: [], lineHeight: effectiveLineHeight };
  }

  const logicalLines = text.split(/\r?\n/);
  const visualLines: TextLine[] = [];
  let currentAlign: "left" | "center" | "right" = defaultAlign;

  const baseWeight = fontWeight ?? "400";
  const measureNormal = createTextMeasurer(fontSize, fontFamily, baseWeight, "normal");
  const measureItalic = createTextMeasurer(fontSize, fontFamily, baseWeight, "italic");
  const measureBold = createTextMeasurer(fontSize, fontFamily, "700", "normal");
  const measureBoldItalic = createTextMeasurer(fontSize, fontFamily, "700", "italic");
  const letterSpacingPx = (letterSpacingEm ?? 0) * fontSize;

  const measure = (text: string, token?: Extract<WrapToken, { kind: "text" }>) => {
    const baseWidth = token?.bold && token?.italic
      ? measureBoldItalic(text)
      : token?.bold
        ? measureBold(text)
        : token?.italic
          ? measureItalic(text)
          : measureNormal(text);
    if (letterSpacingPx <= 0 || text.length <= 1) return baseWidth;
    return baseWidth + (text.length - 1) * letterSpacingPx;
  };
  const safeWidth = Math.max(0, width - fontSize * 0.4);

  const pushAlignedLine = (lineText: string, align: "left" | "center" | "right") => {
    // Preserve intentional blank lines (including lines with only whitespace) as visual gaps.
    if (lineText.trim() === "") {
      visualLines.push({ kind: "text", tokens: [{ kind: "text", text: "" }], align });
      return;
    }

    const trimmedLine = lineText.trim();
    const startsWithDice = trimmedLine.startsWith("[{");

    // Leader lines: [label[sep]value]
    const leaderMatch = startsWithDice ? null : lineText.match(/^\[(.+?)\[(.*?)\](.+?)\]$/);
    if (leaderMatch) {
      const labelRaw = leaderMatch[1];
      const sepRaw = leaderMatch[2];
      const valueRaw = leaderMatch[3];

      const separator = sepRaw || ".";
      const labelTokens = injectDiceAdjacentSpaces(
        segmentsToTokens(tokenizeInlineDice(labelRaw), fontSize),
      );
      const valueTokens = injectDiceAdjacentSpaces(
        segmentsToTokens(tokenizeInlineDice(valueRaw), fontSize),
      );

      visualLines.push({
        kind: "leader",
        labelTokens,
        valueTokens,
        separator,
        align,
      });
      return;
    }

    const inlineSegments = tokenizeInlineDice(lineText);
    const tokens = injectDiceAdjacentSpaces(segmentsToTokens(inlineSegments, fontSize));
    const wrapped = wrapTokens(tokens, safeWidth, measure);
    wrapped.forEach((lineTokens) => {
      visualLines.push({ kind: "text", tokens: lineTokens, align });
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
    fontWeight,
    letterSpacingEm,
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
    fontKerning: "normal",
  };

  const measure = createTextMeasurer(fontSize, fontFamily);
  const maskPrefix = useId().replace(/:/g, "");

  return (
    <g>
      {clippedLines.flatMap((line, lineIndex) => {
        const lineY = bounds.y + fontSize + effectiveLineHeight * lineIndex;

        if (line.kind === "text") {
        return renderTokenLine({
          lineTokens: line.tokens,
          lineY,
          lineHeight: effectiveLineHeight,
          bounds,
          lineAlign: line.align ?? align,
          measure,
          fill,
            textStyle,
            maskPrefix,
            lineIndex,
            fontSize,
          });
        }

        // Leader line rendering
        const leaderPadding = fontSize * 0.25;
        const leftX = bounds.x;
        const rightX = bounds.x + bounds.width;

        const labelWidth = measureTokensWidth(line.labelTokens, measure);
        const valueWidth = measureTokensWidth(line.valueTokens, measure);

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

        const elements: JSX.Element[] = [];

        elements.push(
          ...renderTokenSequence({
          tokens: line.labelTokens,
          startX: labelStartX,
          y: lineY,
          lineHeight: effectiveLineHeight,
          measure,
          fill,
          textStyle,
            maskPrefix,
            lineIndex,
            tokenGroup: "label",
            fontSize,
          }),
        );

        if (sepText) {
          elements.push(
            <text
              key={`${lineIndex}-sep`}
              x={gapStartX}
              y={lineY}
              fill={fill}
              style={textStyle}
            >
              {sepText}
            </text>,
          );
        }

        elements.push(
          ...renderTokenSequence({
          tokens: line.valueTokens,
          startX: valueStartX,
          y: lineY,
          lineHeight: effectiveLineHeight,
          measure,
          fill,
          textStyle,
            maskPrefix,
            lineIndex,
            tokenGroup: "value",
            fontSize,
          }),
        );

        return elements;
      })}
    </g>
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
  const pattern =
    /\*\*\*(\S(?:[\s\S]*?\S)?)\*\*\*|\*\*(\S(?:[\s\S]*?\S)?)\*\*|\*(\S(?:[\s\S]*?\S)?)\*/g;

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

    const boldItalicText = match[1];
    const boldText = match[2];
    const italicText = match[3];

    if (boldItalicText != null) {
      pushRun(boldItalicText, true, true);
    } else if (boldText != null) {
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

function segmentsToTokens(segments: InlineDiceSegment[], fontSize: number): TextToken[] {
  const tokens: TextToken[] = [];
  const diceSize = fontSize * DICE_SIZE_RATIO;
  const diceGap = fontSize * DICE_TEXT_GAP_RATIO + DICE_TEXT_GAP_PX;
  const diceAdvance = diceSize + diceGap * 2;

  segments.forEach((segment, segmentIndex) => {
    if (segment.kind === "dice") {
      const prevSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;
      const nextSegment = segmentIndex < segments.length - 1 ? segments[segmentIndex + 1] : null;
      tokens.push({
        kind: "dice",
        dice: segment.token,
        width: diceAdvance,
        renderSize: diceSize,
      });
      return;
    }

    const runs = parseInlineMarkdown(segment.text);
    const textTokens = runsToTokens(runs).map((token) => ({
      kind: "text" as const,
      text: token.text,
      bold: token.bold,
      italic: token.italic,
    }));
    tokens.push(...textTokens);
  });

  return tokens;
}

function injectDiceAdjacentSpaces(tokens: TextToken[]): TextToken[] {
  const output: TextToken[] = [];

  tokens.forEach((token, index) => {
    if (token.kind !== "dice") {
      output.push(token);
      return;
    }

    const prevToken = index > 0 ? tokens[index - 1] : null;
    const nextToken = index < tokens.length - 1 ? tokens[index + 1] : null;
    const hasPrevText = Boolean(
      prevToken &&
        prevToken.kind === "text" &&
        prevToken.text &&
        !/\s$/.test(prevToken.text),
    );
    const hasNextText = Boolean(
      nextToken &&
        nextToken.kind === "text" &&
        nextToken.text &&
        !/^\s/.test(nextToken.text),
    );

    if (hasPrevText && prevToken?.kind === "text") {
      output.push({
        kind: "text",
        text: " ",
        bold: prevToken.bold,
        italic: prevToken.italic,
      });
    }

    output.push(token);

    if (hasNextText && nextToken?.kind === "text") {
      output.push({
        kind: "text",
        text: " ",
        bold: nextToken.bold,
        italic: nextToken.italic,
      });
    }
  });

  return output;
}

function measureTokensWidth(
  tokens: TextToken[],
  measure: (text: string, token?: Extract<WrapToken, { kind: "text" }>) => number,
): number {
  return tokens.reduce((sum, token) => {
    if (token.kind === "dice") return sum + token.width;
    return sum + measure(token.text, token);
  }, 0);
}

function getMaskId(
  prefix: string,
  lineIndex: number,
  tokenGroup: string,
  tokenIndex: number,
): string {
  return `${prefix}-dice-${tokenGroup}-${lineIndex}-${tokenIndex}`;
}

function renderTokenSequence({
  tokens,
  startX,
  y,
  lineHeight,
  measure,
  fill,
  textStyle,
  maskPrefix,
  lineIndex,
  tokenGroup,
  fontSize,
}: {
  tokens: TextToken[];
  startX: number;
  y: number;
  lineHeight: number;
  measure: (text: string, token?: Extract<WrapToken, { kind: "text" }>) => number;
  fill: string;
  textStyle: CSSProperties;
  maskPrefix: string;
  lineIndex: number;
  tokenGroup: string;
  fontSize: number;
}): JSX.Element[] {
  let cursorX = startX;
  const elements: JSX.Element[] = [];

  let runStartX = cursorX;
  let runSpans: JSX.Element[] = [];
  let runIndex = 0;

  const flushRun = () => {
    if (runSpans.length === 0) return;
    elements.push(
      <text
        key={`${tokenGroup}-${lineIndex}-text-${runIndex}`}
        x={runStartX}
        y={y}
        fill={fill}
        style={textStyle}
      >
        {runSpans}
      </text>,
    );
    runSpans = [];
    runIndex += 1;
  };

  tokens.forEach((token, tokenIndex) => {
    if (token.kind === "dice") {
      flushRun();
      runStartX = cursorX;

      const maskId = getMaskId(maskPrefix, lineIndex, tokenGroup, tokenIndex);
      const size = token.renderSize;
      const baseGap = fontSize * DICE_TEXT_GAP_RATIO + DICE_TEXT_GAP_PX;
      const maskX = cursorX + baseGap;
      const textCenterY =
        y - fontSize + lineHeight * DICE_TEXT_CENTER_RATIO + DICE_Y_OFFSET_PX;
      const maskY = textCenterY - size / 2;
      const padding = size * DICE_ICON_PADDING_RATIO;
      const innerSize = Math.max(0, size - padding * 2);
      const innerX = maskX + padding;
      const innerY = maskY + padding;
      const cornerRadius = size * DICE_CORNER_RADIUS_RATIO;
      const diceBgColor = token.dice.color ?? DICE_BG_COLOR;
      const diceFaceColor = token.dice.faceColor ?? DICE_FACE_COLOR;
      const diceBorderColor = token.dice.faceColor ?? DICE_BORDER_COLOR;
      elements.push(
        <rect
          key={`${maskId}-bg`}
          x={maskX}
          y={maskY}
          width={size}
          height={size}
          rx={cornerRadius}
          ry={cornerRadius}
          fill={diceBgColor}
          stroke={diceBorderColor}
          strokeWidth={DICE_BORDER_WIDTH}
        />,
        <mask
          key={`${maskId}-mask`}
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={innerX}
          y={innerY}
          width={innerSize}
          height={innerSize}
        >
          <image
            href={token.dice.svgUrl}
            x={innerX}
            y={innerY}
            width={innerSize}
            height={innerSize}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>,
        <rect
          key={`${maskId}-rect`}
          x={innerX}
          y={innerY}
          width={innerSize}
          height={innerSize}
          fill={diceFaceColor}
          mask={`url(#${maskId})`}
        />,
      );
      cursorX += token.width;
      runStartX = cursorX;
      return;
    }

    const spanStyle: CSSProperties = {};
    if (token.bold) spanStyle.fontWeight = "700";
    if (token.italic) spanStyle.fontStyle = "italic";

    runSpans.push(
      <tspan
        key={`${tokenGroup}-${lineIndex}-${tokenIndex}`}
        style={spanStyle}
      >
        {token.text}
      </tspan>,
    );
    cursorX += measure(token.text, token);
  });

  flushRun();

  return elements;
}

function renderTokenLine({
  lineTokens,
  lineY,
  lineHeight,
  bounds,
  lineAlign,
  measure,
  fill,
  textStyle,
  maskPrefix,
  lineIndex,
  fontSize,
}: {
  lineTokens: TextToken[];
  lineY: number;
  lineHeight: number;
  bounds: Bounds;
  lineAlign: "left" | "center" | "right";
  measure: (text: string) => number;
  fill: string;
  textStyle: CSSProperties;
  maskPrefix: string;
  lineIndex: number;
  fontSize: number;
}): JSX.Element[] {
  const lineWidth = measureTokensWidth(lineTokens, measure);
  const originX =
    lineAlign === "center"
      ? bounds.x + bounds.width / 2 - lineWidth / 2
      : lineAlign === "right"
        ? bounds.x + bounds.width - lineWidth
        : bounds.x;

  return renderTokenSequence({
    tokens: lineTokens,
    startX: originX,
    y: lineY,
    lineHeight,
    measure,
    fill,
    textStyle,
    maskPrefix,
    lineIndex,
    tokenGroup: "text",
    fontSize,
  });
}

// createTextMeasurer moved to shared lib for reuse.
