import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
import {
  STATS_VERTICAL_SCALE_Y,
  USE_STATS_VERTICAL_COMPRESSION,
  USE_TIGHTER_STATS_TRACKING,
} from "@/config/flags";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { formatStatValue } from "@/lib/stat-values";
import fitText from "@/lib/text-fitting/fitText";
import { shrinkToFitSingleLine } from "@/lib/text-fitting/shrink";
import type { StatValue } from "@/types/stats";

import Layer from "../CardPreview/Layer";

type StatsPairProps = {
  header: string;
  value?: StatValue;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight?: number;
  debug?: boolean;
};

const MARGIN = 10;

const HEADER_FONT_SIZE = 22;
const HEADER_LINE_HEIGHT = HEADER_FONT_SIZE * 1.05;
const VALUE_FONT_SIZE = 56;
const MIN_VALUE_FONT_SIZE = 24;
const HEADER_LETTER_SPACING = -0.4;

export default function StatsPair({
  header,
  value,
  x,
  y,
  width,
  height,
  headerHeight,
  debug = false,
}: StatsPairProps) {
  const resolvedHeaderHeight = headerHeight ?? height / 2;
  const valueHeight = height - resolvedHeaderHeight;

  const innerX = x + MARGIN;
  const innerWidth = width - MARGIN * 2;

  const centerX = innerX + innerWidth / 2;

  const headerBoxY = y;
  const headerCenterY = headerBoxY + resolvedHeaderHeight / 2;

  const valueBoxY = y + resolvedHeaderHeight;
  const valueCenterY = valueBoxY + valueHeight / 2;

  const { preferences } = useTextFittingPreferences();
  const headerLayout = fitText(
    "statHeading",
    header,
    {
      width: innerWidth,
      height: resolvedHeaderHeight,
    },
    preferences.statHeading,
  );
  const headerLines = headerLayout.lines;
  const headerFontSize = headerLayout.fontSize;
  const headerLineHeight = headerLayout.lineHeight ?? HEADER_LINE_HEIGHT;
  const lineCount = headerLines.length || 1;
  const totalHeaderTextHeight = headerLineHeight * lineCount;
  const firstLineY = headerCenterY - (totalHeaderTextHeight - headerLineHeight) / 2;
  const formattedValue = formatStatValue(value);
  const headerLetterSpacing = USE_TIGHTER_STATS_TRACKING ? HEADER_LETTER_SPACING : undefined;
  const statsScaleY = USE_STATS_VERTICAL_COMPRESSION ? STATS_VERTICAL_SCALE_Y : 1;
  const statsTransform =
    statsScaleY === 1
      ? undefined
      : `translate(${centerX} ${headerCenterY}) scale(1 ${statsScaleY}) translate(${-centerX} ${-headerCenterY})`;
  const valueTransform =
    statsScaleY === 1
      ? undefined
      : `translate(${centerX} ${valueCenterY}) scale(1 ${statsScaleY}) translate(${-centerX} ${-valueCenterY})`;
  const valueFontSize =
    formattedValue != null
      ? shrinkToFitSingleLine(
          formattedValue,
          innerWidth,
          valueHeight,
          VALUE_FONT_SIZE,
          MIN_VALUE_FONT_SIZE,
        )
      : VALUE_FONT_SIZE;

  return (
    <Layer>
      <g transform={statsTransform}>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          // fill="#ffffff"
          fill="#452304"
          fontSize={headerFontSize}
          fontWeight={700}
          letterSpacing={headerLetterSpacing}
          fontFamily={CARD_TEXT_FONT_FAMILY}
        >
          {headerLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={centerX} y={firstLineY + index * headerLineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
      {formattedValue != null && (
        <g transform={valueTransform}>
          <text
            x={centerX}
            y={valueCenterY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#452304"
            fontSize={valueFontSize}
            fontWeight={700}
            fontFamily={CARD_TEXT_FONT_FAMILY}
          >
            {formattedValue}
          </text>
        </g>
      )}
      {/* Header bounds (debug) */}
      {debug && (
        <rect
          x={innerX}
          y={headerBoxY}
          width={innerWidth}
          height={resolvedHeaderHeight}
          fill="transparent"
          stroke="#cd14e2ff"
          strokeWidth={2}
        />
      )}
      {/* Value bounds (debug) */}
      {debug && value != undefined && (
        <rect
          x={innerX}
          y={valueBoxY}
          width={innerWidth}
          height={valueHeight}
          fill="transparent"
          stroke="#14e2cdff"
          strokeWidth={2}
        />
      )}
    </Layer>
  );
}
