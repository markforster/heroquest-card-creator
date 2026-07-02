"use client";

import { useId } from "react";

import { layoutCardTextToBounds } from "@/components/Cards/CardParts/bodyText/fit";
import parseInlineRichText from "@/components/Cards/CardParts/bodyText/parseInlineRichText";
import type { BodyTextToken, TextAlignment } from "@/components/Cards/CardParts/bodyText/types";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { tokenizeInlineDice, type InlineDiceSegment } from "@/lib/inline-dice";
import { createTextMeasurer } from "@/lib/text-fitting/measure";
import { runsToTokens, wrapTokens, type WrapToken } from "@/lib/text-fitting/wrap";

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
  align?: TextAlignment;
  debug?: boolean;
  fitToBounds?: boolean;
  showOverflowWarning?: boolean;
};

const CARD_BODY_LINE_HEIGHT = 1.05;
const OVERFLOW_WARNING_COLOR = "#d62839";
const OVERFLOW_WARNING_FILL_OPACITY = 0.2;
const OVERFLOW_WARNING_HATCH_OPACITY = 0.5;
const OVERFLOW_WARNING_LABEL_COLOR = "#ffffff";
const OVERFLOW_WARNING_STROKE_WIDTH = 1.75;
const OVERFLOW_WARNING_LABEL = "Text clipped";
const OVERFLOW_WARNING_LABEL_FONT_SIZE = 16;
const OVERFLOW_WARNING_LABEL_FONT_WEIGHT = 700;
const OVERFLOW_WARNING_LABEL_LETTER_SPACING_EM = 0.02;
const OVERFLOW_WARNING_STRIP_HEIGHT = 36;
const OVERFLOW_WARNING_BORDER_RISE = 6;
const OVERFLOW_WARNING_HATCH_SPACING = 6;
const OVERFLOW_WARNING_HATCH_WIDTH = 6;
const OVERFLOW_WARNING_HATCH_RISE = 6;
const DICE_SIZE_RATIO = 1.18;
const DICE_TEXT_GAP_RATIO = 0.14;
const DICE_TEXT_GAP_PX = 2;
const DICE_CORNER_RADIUS_RATIO = 0.22;
const DICE_ICON_PADDING_RATIO = 0.08;
const DICE_TEXT_CENTER_RATIO = 0.5;
const DICE_Y_OFFSET_PX = 0;
const DICE_FACE_COLOR = "#111111";
const DICE_BG_COLOR = "#ffffff";
const DICE_BORDER_COLOR = "#111111";
const DICE_BORDER_WIDTH = 1;

type TextLine =
  | { kind: "text"; tokens: BodyTextToken[]; align?: TextAlignment; height: number }
  | {
      kind: "leader";
      labelTokens: BodyTextToken[];
      valueTokens: BodyTextToken[];
      separator: string;
      leaderLayout?: LeaderLayout;
      align?: TextAlignment;
      height: number;
    }
  | {
      kind: "leader-continuation";
      valueTokens: BodyTextToken[];
      leaderLayout: LeaderLayout;
      align?: TextAlignment;
      height: number;
    }
  | {
      kind: "paragraph-gap";
      height: number;
    };

export type CardTextLayout = {
  rows: TextLine[];
  lines: TextLine[];
  lineHeight: number;
  paragraphGap: number;
  totalHeight: number;
};

type TextToken = BodyTextToken;

type LeaderLayout = {
  valueStartOffset: number;
  valueColumnWidth: number;
  leaderPadding: number;
};

type LeaderGroupSettings = {
  pivotMode: "auto" | "fixed";
  pivotValue?: number;
  wrap: "value" | "none";
  explicit: boolean;
};

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
  defaultAlign?: TextAlignment;
}): CardTextLayout {
  const effectiveLineHeight = lineHeight ?? fontSize * CARD_BODY_LINE_HEIGHT;
  const paragraphGap = effectiveLineHeight;

  if (!text || !text.trim()) {
    return {
      rows: [],
      lines: [],
      lineHeight: effectiveLineHeight,
      paragraphGap,
      totalHeight: 0,
    };
  }

  const logicalLines = text.split(/\r?\n/);
  const rows: TextLine[] = [];
  let currentAlign: TextAlignment = defaultAlign;
  const measure = createStyledTextMeasure({
    fontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm,
  });
  const safeWidth = Math.max(0, width - fontSize * 0.4);

  const isGroupStartLine = (lineText: string) => lineText.trim() === "[[";
  const isGroupEndLine = (lineText: string) => lineText.trim() === "]]";
  const isGroupSettingsLine = (lineText: string) => /^\s*\[\{[\s\S]*\}\]\s*,?\s*$/.test(lineText);
  const isSingleLineGroup = (lineText: string) => /^\s*\[\[[\s\S]*\]\]\s*$/.test(lineText);

  const parseLeaderGroupSettings = (lineText: string): LeaderGroupSettings | null => {
    if (!isGroupSettingsLine(lineText)) return null;
    const trimmed = lineText.trim().replace(/,\s*$/, "");
    const inner = trimmed.slice(2, -2).trim();
    if (!inner) return null;

    const settings: LeaderGroupSettings = {
      pivotMode: "auto",
      wrap: "value",
      explicit: true,
    };
    const parts = inner
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const [rawKey, rawValue] = part.split(":").map((item) => item.trim());
      if (!rawKey || !rawValue) continue;
      const key = rawKey.toLowerCase();
      const value = rawValue.toLowerCase();
      if (key === "pivot") {
        if (value.endsWith("%")) {
          const num = Number.parseFloat(value.slice(0, -1));
          if (!Number.isNaN(num)) {
            const pivot = num / 100;
            if (pivot >= 0 && pivot <= 1) {
              settings.pivotMode = "fixed";
              settings.pivotValue = pivot;
            }
          }
        } else {
          const num = Number.parseFloat(value);
          if (!Number.isNaN(num) && num >= 0 && num <= 1) {
            settings.pivotMode = "fixed";
            settings.pivotValue = num;
          }
        }
      } else if (key === "wrap") {
        if (value === "value" || value === "none") {
          settings.wrap = value;
        }
      }
    }

    return settings;
  };

  const parseLeaderLine = (
    lineText: string,
  ): { labelTokens: WrapToken[]; valueTokens: WrapToken[]; separator: string } | null => {
    const trimmed = lineText.trim();
    const startsWithDice = trimmed.startsWith("[{");
    const leaderMatch = startsWithDice ? null : lineText.match(/^\[(.+?)\[(.*?)\](.+?)\]$/);
    if (!leaderMatch) return null;

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
    return { labelTokens, valueTokens, separator };
  };

  const parseSingleLineGroup = (
    lineText: string,
  ): {
    settings: LeaderGroupSettings;
    leaders: NonNullable<ReturnType<typeof parseLeaderLine>>[];
  } | null => {
    if (!isSingleLineGroup(lineText)) return null;
    const trimmed = lineText.trim();
    const inner = trimmed.slice(2, -2).trim();
    if (!inner) return null;

    let settings: LeaderGroupSettings = {
      pivotMode: "auto",
      wrap: "none",
      explicit: false,
    };
    let remainder = inner;

    if (remainder.startsWith("[{")) {
      const endIndex = remainder.indexOf("}]");
      if (endIndex >= 0) {
        const settingsText = remainder.slice(0, endIndex + 2);
        const parsed = parseLeaderGroupSettings(settingsText);
        if (parsed) settings = parsed;
        remainder = remainder.slice(endIndex + 2).trim();
      }
    }

    if (!remainder) return null;

    const leaders: NonNullable<ReturnType<typeof parseLeaderLine>>[] = [];
    let depth = 0;
    let segmentStart = -1;
    for (let i = 0; i < remainder.length; i += 1) {
      const ch = remainder[i];
      if (ch === "[") {
        if (depth === 0) segmentStart = i;
        depth += 1;
      } else if (ch === "]") {
        depth = Math.max(0, depth - 1);
        if (depth === 0 && segmentStart >= 0) {
          const segment = remainder.slice(segmentStart, i + 1);
          const leader = parseLeaderLine(segment);
          if (leader) leaders.push(leader);
          segmentStart = -1;
        }
      }
    }

    if (leaders.length === 0) return null;
    return { settings, leaders };
  };

  const hasMatchingGroupEnd = (() => {
    const flags = new Array(logicalLines.length).fill(false);
    let i = 0;
    while (i < logicalLines.length) {
      if (isGroupStartLine(logicalLines[i])) {
        let j = i + 1;
        while (j < logicalLines.length && !isGroupEndLine(logicalLines[j])) {
          j += 1;
        }
        if (j < logicalLines.length) {
          flags[i] = true;
          i = j + 1;
          continue;
        }
      }
      i += 1;
    }
    return flags;
  })();

  const pushParagraphGap = () => {
    rows.push({ kind: "paragraph-gap", height: paragraphGap });
  };

  const pushWrappedTextLine = (lineText: string, align: TextAlignment) => {
    // Preserve intentional blank lines (including lines with only whitespace) as visual gaps.
    if (lineText.trim() === "") {
      pushParagraphGap();
      return;
    }

    const inlineSegments = tokenizeInlineDice(lineText);
    const tokens = injectDiceAdjacentSpaces(segmentsToTokens(inlineSegments, fontSize));
    const wrapped = wrapTokens(tokens, safeWidth, measure);
    wrapped.forEach((lineTokens) => {
      rows.push({ kind: "text", tokens: lineTokens, align, height: effectiveLineHeight });
    });
  };

  const pushAlignedLine = (lineText: string, align: TextAlignment) => {
    // Preserve intentional blank lines (including lines with only whitespace) as visual gaps.
    if (lineText.trim() === "") {
      pushParagraphGap();
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

      rows.push({
        kind: "leader",
        labelTokens,
        valueTokens,
        separator,
        align,
        height: effectiveLineHeight,
      });
      return;
    }

    pushWrappedTextLine(lineText, align);
  };

  let inlineAlign: TextAlignment | null = null;

  let groupActive = false;
  let groupSettings: LeaderGroupSettings = {
    pivotMode: "auto",
    wrap: "none",
    explicit: false,
  };
  let groupLines: Array<{
    labelTokens: WrapToken[];
    valueTokens: WrapToken[];
    separator: string;
    align: TextAlignment;
  }> = [];

  const computeGroupLayout = (
    items: typeof groupLines,
    settings: LeaderGroupSettings,
  ): LeaderLayout => {
    const leaderPadding = fontSize * 0.25;
    let maxLabelWidth = 0;
    let maxValueWidth = 0;
    items.forEach((item) => {
      maxLabelWidth = Math.max(maxLabelWidth, measureTokensWidth(item.labelTokens, measure));
      maxValueWidth = Math.max(maxValueWidth, measureTokensWidth(item.valueTokens, measure));
    });

    const minValueColumnWidth =
      settings.wrap === "value" ? Math.max(width * 0.25, fontSize * 4) : 0;

    if (settings.pivotMode === "fixed" && typeof settings.pivotValue === "number") {
      const desiredStart = width * settings.pivotValue;
      const minStart = Math.min(width, maxLabelWidth + leaderPadding * 2);
      const maxStart = Math.max(
        0,
        width - (settings.wrap === "none" ? maxValueWidth : minValueColumnWidth),
      );
      const clampedStart = Math.min(Math.max(desiredStart, minStart), maxStart);
      const valueStartOffset = Number.isFinite(clampedStart) ? clampedStart : 0;
      const valueColumnWidth = Math.max(0, width - valueStartOffset);
      return { valueStartOffset, valueColumnWidth, leaderPadding };
    }

    let valueColumnWidth = Math.min(
      maxValueWidth,
      Math.max(0, width - maxLabelWidth - leaderPadding * 2),
    );
    if (valueColumnWidth < minValueColumnWidth) {
      valueColumnWidth = Math.min(width, minValueColumnWidth);
    }
    const valueStartOffset = Math.max(0, width - valueColumnWidth);
    return { valueStartOffset, valueColumnWidth, leaderPadding };
  };

  const flushLeaderGroup = () => {
    if (groupLines.length === 0) {
      groupActive = false;
      groupSettings = { pivotMode: "auto", wrap: "none", explicit: false };
      return;
    }

    if (!groupSettings.explicit) {
      groupLines.forEach((line) => {
        rows.push({
          kind: "leader",
          labelTokens: line.labelTokens,
          valueTokens: line.valueTokens,
          separator: line.separator,
          align: line.align,
          height: effectiveLineHeight,
        });
      });
    } else {
      const layout = computeGroupLayout(groupLines, groupSettings);
      groupLines.forEach((line) => {
        const wrappedValue =
          groupSettings.wrap === "value" && layout.valueColumnWidth > 0
            ? wrapTokens(line.valueTokens, layout.valueColumnWidth, measure)
            : [line.valueTokens];
        const [firstLine, ...restLines] = wrappedValue;
        rows.push({
          kind: "leader",
          labelTokens: line.labelTokens,
          valueTokens: firstLine ?? [],
          separator: line.separator,
          leaderLayout: layout,
          align: line.align,
          height: effectiveLineHeight,
        });
        restLines.forEach((valueTokens) => {
          rows.push({
            kind: "leader-continuation",
            valueTokens,
            leaderLayout: layout,
            align: line.align,
            height: effectiveLineHeight,
          });
        });
      });
    }

    groupLines = [];
    groupActive = false;
    groupSettings = { pivotMode: "auto", wrap: "none", explicit: false };
  };

  for (let index = 0; index < logicalLines.length; index += 1) {
    const logicalLine = logicalLines[index];
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

    if (groupActive) {
      const trimmed = logicalLine.trim();
      const leaderCandidate = trimmed.replace(/,\s*$/, "");
      if (isGroupEndLine(logicalLine)) {
        flushLeaderGroup();
        continue;
      }

      const parsedLeader = parseLeaderLine(leaderCandidate);
      if (parsedLeader) {
        groupLines.push({
          labelTokens: parsedLeader.labelTokens,
          valueTokens: parsedLeader.valueTokens,
          separator: parsedLeader.separator,
          align: currentAlign,
        });
        continue;
      }

      flushLeaderGroup();
      pushAlignedLine(logicalLine, currentAlign);
      continue;
    }

    const inlineGroup = parseSingleLineGroup(logicalLine);
    if (inlineGroup) {
      groupActive = true;
      groupSettings = inlineGroup.settings;
      inlineGroup.leaders.forEach((leader) => {
        groupLines.push({
          labelTokens: leader.labelTokens,
          valueTokens: leader.valueTokens,
          separator: leader.separator,
          align: currentAlign,
        });
      });
      flushLeaderGroup();
      continue;
    }

    if (isGroupStartLine(logicalLine) && hasMatchingGroupEnd[index]) {
      groupActive = true;
      groupSettings = { pivotMode: "auto", wrap: "none", explicit: false };
      if (index + 1 < logicalLines.length && isGroupSettingsLine(logicalLines[index + 1])) {
        const parsedSettings = parseLeaderGroupSettings(logicalLines[index + 1]);
        if (parsedSettings) groupSettings = parsedSettings;
        index += 1;
      }
      continue;
    }

    pushAlignedLine(logicalLine, currentAlign);
  }

  if (groupActive) {
    flushLeaderGroup();
  }

  const lines = rows.filter((row) => row.kind !== "paragraph-gap");
  const totalHeight = rows.reduce((sum, row) => sum + row.height, 0);

  return { rows, lines, lineHeight: effectiveLineHeight, paragraphGap, totalHeight };
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
  debug = false,
  fitToBounds = false,
  showOverflowWarning = false,
}: CardTextBlockProps) {
  const maskPrefix = useId().replace(/:/g, "");
  const {
    rows,
    lines,
    lineHeight: effectiveLineHeight,
    fittedFontSize,
    overflowed,
  } = layoutCardTextToBounds({
    layout: layoutCardText,
    text,
    width: bounds.width,
    height: bounds.height,
    fontSize,
    lineHeight,
    fontFamily,
    fontWeight,
    letterSpacingEm,
    defaultAlign: align,
    fitToBounds,
  });

  if (lines.length === 0) {
    return null;
  }

  const clippedRows = overflowed ? clipRowsToHeight(rows, bounds.height) : rows;

  const textStyle: CSSProperties = {
    fontFamily,
    fontSize: fittedFontSize,
    fontWeight,
    letterSpacing: letterSpacingEm != null ? `${letterSpacingEm}em` : undefined,
    fontKerning: "normal",
  };

  const measureWithSpacing = createStyledTextMeasure({
    fontSize: fittedFontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm,
  });

  return (
    <g>
      {showOverflowWarning && overflowed ? (
        <OverflowWarningStrip bounds={bounds} idPrefix={maskPrefix} />
      ) : null}
      {debug && (
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
          stroke="#cd14e2ff"
          strokeWidth={2}
          data-debug-bounds="true"
        />
      )}
      {(() => {
        let verticalOffset = 0;
        let renderedLineIndex = 0;
        const elements: JSX.Element[] = [];

        clippedRows.forEach((line) => {
          if (line.kind === "paragraph-gap") {
            verticalOffset += line.height;
            return;
          }

          const lineY = bounds.y + verticalOffset + fittedFontSize;

          if (line.kind === "text") {
            elements.push(
              ...renderTokenLine({
                lineTokens: line.tokens,
                lineY,
                lineHeight: effectiveLineHeight,
                bounds,
                lineAlign: line.align ?? align,
                measure: measureWithSpacing,
                fill,
                textStyle,
                maskPrefix,
                lineIndex: renderedLineIndex,
                fontSize: fittedFontSize,
              }),
            );
            verticalOffset += line.height;
            renderedLineIndex += 1;
            return;
          }

          if (line.kind === "leader-continuation") {
            const valueStartX = bounds.x + line.leaderLayout.valueStartOffset;
            elements.push(
              ...renderTokenSequence({
                tokens: line.valueTokens,
                startX: valueStartX,
                y: lineY,
                lineHeight: effectiveLineHeight,
                measure: measureWithSpacing,
                fill,
                textStyle,
                maskPrefix,
                lineIndex: renderedLineIndex,
                tokenGroup: "value",
                fontSize: fittedFontSize,
              }),
            );
            verticalOffset += line.height;
            renderedLineIndex += 1;
            return;
          }

          // Leader line rendering
          const effectiveLeaderPadding = line.leaderLayout?.leaderPadding ?? fittedFontSize * 0.25;
          const leftX = bounds.x;
          const rightX = bounds.x + bounds.width;

          const labelWidth = measureTokensWidth(line.labelTokens, measureWithSpacing);
          const valueWidth = measureTokensWidth(line.valueTokens, measureWithSpacing);

          const labelStartX = leftX;
          const valueStartX =
            line.leaderLayout?.valueStartOffset != null
              ? bounds.x + line.leaderLayout.valueStartOffset
              : rightX - valueWidth;

          const gapStartX = labelStartX + labelWidth + effectiveLeaderPadding;
          const gapEndX = valueStartX - effectiveLeaderPadding;
          const availableGapWidth = Math.max(0, gapEndX - gapStartX);

          const sepChar = line.separator || ".";
          const sepWidth = measureWithSpacing(sepChar);
          const sepCount =
            sepWidth > 0 ? Math.max(0, Math.floor(availableGapWidth / sepWidth)) : 0;
          const sepText = sepCount > 0 ? sepChar.repeat(sepCount) : "";

          elements.push(
            ...renderTokenSequence({
              tokens: line.labelTokens,
              startX: labelStartX,
              y: lineY,
              lineHeight: effectiveLineHeight,
              measure: measureWithSpacing,
              fill,
              textStyle,
              maskPrefix,
              lineIndex: renderedLineIndex,
              tokenGroup: "label",
              fontSize: fittedFontSize,
            }),
          );

          if (sepText) {
            elements.push(
              <text
                key={`${renderedLineIndex}-sep`}
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
              measure: measureWithSpacing,
              fill,
              textStyle,
              maskPrefix,
              lineIndex: renderedLineIndex,
              tokenGroup: "value",
              fontSize: fittedFontSize,
            }),
          );

          verticalOffset += line.height;
          renderedLineIndex += 1;
        });

        return elements;
      })()}
    </g>
  );
}

function OverflowWarningStrip({
  bounds,
  idPrefix,
}: {
  bounds: Bounds;
  idPrefix: string;
}) {
  const stripHeight = Math.min(OVERFLOW_WARNING_STRIP_HEIGHT, Math.max(bounds.height, 0));
  if (stripHeight <= 0 || bounds.width <= 0) return null;

  const stripY = bounds.y + bounds.height - stripHeight;
  const clipPathId = `${idPrefix}-overflow-warning-strip`;
  const gradientId = `${idPrefix}-overflow-warning-gradient`;
  const hatchCount = Math.max(
    1,
    Math.ceil((bounds.width + OVERFLOW_WARNING_HATCH_WIDTH) / OVERFLOW_WARNING_HATCH_SPACING),
  );
  const borderTopY = Math.max(bounds.y, stripY - OVERFLOW_WARNING_BORDER_RISE);

  return (
    <g data-preview-only="overflow-warning" data-overflow-warning="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={OVERFLOW_WARNING_COLOR} stopOpacity={0} />
          <stop
            offset="100%"
            stopColor={OVERFLOW_WARNING_COLOR}
            stopOpacity={OVERFLOW_WARNING_FILL_OPACITY}
          />
        </linearGradient>
        <clipPath id={clipPathId}>
          <rect x={bounds.x} y={stripY} width={bounds.width} height={stripHeight} />
        </clipPath>
      </defs>
      <rect
        x={bounds.x}
        y={stripY}
        width={bounds.width}
        height={stripHeight}
        fill={`url(#${gradientId})`}
      />
      <g clipPath={`url(#${clipPathId})`}>
        {Array.from({ length: hatchCount }, (_, index) => {
          const startX = bounds.x + index * OVERFLOW_WARNING_HATCH_SPACING;
          const startY = bounds.y + bounds.height;
          const endX = startX + OVERFLOW_WARNING_HATCH_WIDTH;
          const endY = startY - Math.min(stripHeight, OVERFLOW_WARNING_HATCH_RISE);

          return (
            <line
              key={`${idPrefix}-overflow-hatch-${index}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={OVERFLOW_WARNING_COLOR}
              strokeOpacity={OVERFLOW_WARNING_HATCH_OPACITY}
              strokeWidth={OVERFLOW_WARNING_STROKE_WIDTH}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <text
        x={bounds.x + bounds.width / 2}
        y={stripY + stripHeight / 2}
        fill={OVERFLOW_WARNING_LABEL_COLOR}
        fontFamily={CARD_TEXT_FONT_FAMILY}
        fontSize={Math.min(
          OVERFLOW_WARNING_LABEL_FONT_SIZE,
          Math.max(10, stripHeight * 0.45),
        )}
        fontWeight={OVERFLOW_WARNING_LABEL_FONT_WEIGHT}
        letterSpacing={`${OVERFLOW_WARNING_LABEL_LETTER_SPACING_EM}em`}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {OVERFLOW_WARNING_LABEL}
      </text>
      <line
        x1={bounds.x}
        y1={borderTopY}
        x2={bounds.x}
        y2={bounds.y + bounds.height}
        stroke={OVERFLOW_WARNING_COLOR}
        strokeWidth={OVERFLOW_WARNING_STROKE_WIDTH}
      />
      <line
        x1={bounds.x + bounds.width}
        y1={borderTopY}
        x2={bounds.x + bounds.width}
        y2={bounds.y + bounds.height}
        stroke={OVERFLOW_WARNING_COLOR}
        strokeWidth={OVERFLOW_WARNING_STROKE_WIDTH}
      />
      <line
        x1={bounds.x}
        y1={bounds.y + bounds.height}
        x2={bounds.x + bounds.width}
        y2={bounds.y + bounds.height}
        stroke={OVERFLOW_WARNING_COLOR}
        strokeWidth={OVERFLOW_WARNING_STROKE_WIDTH}
      />
    </g>
  );
}

export function clipRowsToHeight(rows: TextLine[], maxHeight: number): TextLine[] {
  if (!Number.isFinite(maxHeight) || maxHeight <= 0) return [];

  const clipped: TextLine[] = [];
  let consumedHeight = 0;

  rows.forEach((row) => {
    if (consumedHeight + row.height > maxHeight) return;
    clipped.push(row);
    consumedHeight += row.height;
  });

  while (clipped.length > 0 && clipped[clipped.length - 1]?.kind === "paragraph-gap") {
    clipped.pop();
  }

  return clipped;
}

function parseAlignmentDirective(line: string): TextAlignment | "reset" | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed === ":::") return "reset";

  return getAlignmentToken(trimmed);
}

function parseInlineAlignmentStart(line: string): {
  align: TextAlignment;
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

function getAlignmentToken(token: string): TextAlignment | null {
  const lookup: Record<string, TextAlignment> = {
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

function segmentsToTokens(segments: InlineDiceSegment[], fontSize: number): TextToken[] {
  const tokens: TextToken[] = [];
  const diceSize = fontSize * DICE_SIZE_RATIO;
  const diceGap = fontSize * DICE_TEXT_GAP_RATIO + DICE_TEXT_GAP_PX;
  const diceAdvance = diceSize + diceGap * 2;

  segments.forEach((segment) => {
    if (segment.kind === "dice") {
      tokens.push({
        kind: "dice",
        dice: segment.token,
        width: diceAdvance,
        renderSize: diceSize,
      });
      return;
    }

    const runs = parseInlineRichText(segment.text);
    const textTokens = runsToTokens(runs);
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
      prevToken && prevToken.kind === "text" && prevToken.text && !/\s$/.test(prevToken.text),
    );
    const hasNextText = Boolean(
      nextToken && nextToken.kind === "text" && nextToken.text && !/^\s/.test(nextToken.text),
    );

    if (hasPrevText && prevToken?.kind === "text") {
      output.push({
        kind: "text",
        text: " ",
        bold: prevToken.bold,
        italic: prevToken.italic,
        underline: prevToken.underline,
        color: prevToken.color,
      });
    }

    output.push(token);

    if (hasNextText && nextToken?.kind === "text") {
      output.push({
        kind: "text",
        text: " ",
        bold: nextToken.bold,
        italic: nextToken.italic,
        underline: nextToken.underline,
        color: nextToken.color,
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

function createStyledTextMeasure({
  fontSize,
  fontFamily,
  fontWeight,
  letterSpacingEm,
}: {
  fontSize: number;
  fontFamily: string;
  fontWeight?: number | string;
  letterSpacingEm?: number;
}) {
  const baseWeight = fontWeight ?? "400";
  const measureNormal = createTextMeasurer(fontSize, fontFamily, baseWeight, "normal");
  const measureItalic = createTextMeasurer(fontSize, fontFamily, baseWeight, "italic");
  const measureBold = createTextMeasurer(fontSize, fontFamily, "700", "normal");
  const measureBoldItalic = createTextMeasurer(fontSize, fontFamily, "700", "italic");
  const letterSpacingPx = (letterSpacingEm ?? 0) * fontSize;

  return (text: string, token?: Extract<WrapToken, { kind: "text" }>) => {
    const baseWidth =
      token?.bold && token?.italic
        ? measureBoldItalic(text)
        : token?.bold
          ? measureBold(text)
          : token?.italic
            ? measureItalic(text)
            : measureNormal(text);
    if (letterSpacingPx <= 0 || text.length <= 1) return baseWidth;
    return baseWidth + (text.length - 1) * letterSpacingPx;
  };
}

export function measureCardTextMaxLineWidth({
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
}): { maxLineWidth: number; lineHeight: number; lines: CardTextLayout["lines"] } {
  const { lines, lineHeight: effectiveLineHeight } = layoutCardText({
    text,
    width,
    fontSize,
    lineHeight,
    fontFamily,
    fontWeight,
    letterSpacingEm,
    defaultAlign,
  });

  if (!lines.length) {
    return { maxLineWidth: 0, lineHeight: effectiveLineHeight, lines };
  }

  const measure = createStyledTextMeasure({
    fontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm,
  });

  let maxLineWidth = 0;

  lines.forEach((line) => {
    if (line.kind === "text") {
      const widthValue = measureTokensWidth(line.tokens, measure);
      maxLineWidth = Math.max(maxLineWidth, widthValue);
      return;
    }
    if (line.kind === "leader-continuation") {
      const valueWidth = measureTokensWidth(line.valueTokens, measure);
      const widthValue = line.leaderLayout.valueStartOffset + valueWidth;
      maxLineWidth = Math.max(maxLineWidth, widthValue);
      return;
    }
    if (line.kind === "paragraph-gap") {
      return;
    }
    const labelWidth = measureTokensWidth(line.labelTokens, measure);
    const valueWidth = measureTokensWidth(line.valueTokens, measure);
    const leaderPadding = line.leaderLayout?.leaderPadding ?? fontSize * 0.25;
    const widthValue = labelWidth + leaderPadding + valueWidth;
    maxLineWidth = Math.max(maxLineWidth, widthValue);
  });

  return { maxLineWidth, lineHeight: effectiveLineHeight, lines };
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
      const textCenterY = y - fontSize + lineHeight * DICE_TEXT_CENTER_RATIO + DICE_Y_OFFSET_PX;
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
    if (token.underline) spanStyle.textDecoration = "underline";
    if (token.color) spanStyle.fill = token.color;

    runSpans.push(
      <tspan key={`${tokenGroup}-${lineIndex}-${tokenIndex}`} style={spanStyle}>
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
  lineAlign: TextAlignment;
  measure: (text: string, token?: Extract<WrapToken, { kind: "text" }>) => number;
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
