import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";

import Layer from "../CardPreview/Layer";

type StatsPairProps = {
  header: string;
  value?: number;
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

function wrapHeaderLines(text: string, maxWidth: number): string[] {
  const approxCharWidth = HEADER_FONT_SIZE * 0.6;
  const words = text.split(" ");
  const lines: string[] = [];

  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const estimatedWidth = candidate.length * approxCharWidth;

    if (!current || estimatedWidth <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

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

  const headerLines = wrapHeaderLines(header, innerWidth);
  const lineCount = headerLines.length || 1;
  const totalHeaderTextHeight = HEADER_LINE_HEIGHT * lineCount;
  const firstLineY = headerCenterY - (totalHeaderTextHeight - HEADER_LINE_HEIGHT) / 2;

  return (
    <Layer>
      {/* Header bounds (debug) */}
      {debug && (
        <rect
          x={innerX}
          y={headerBoxY}
          width={innerWidth}
          height={resolvedHeaderHeight}
          fill="transparent"
          stroke="#cd14e2ff"
          strokeWidth={1}
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
          strokeWidth={1}
        />
      )}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        // fill="#ffffff"
        fill="#452304"
        fontSize={HEADER_FONT_SIZE}
        fontWeight={700}
        fontFamily={CARD_TEXT_FONT_FAMILY}
      >
        {headerLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={centerX} y={firstLineY + index * HEADER_LINE_HEIGHT}>
            {line}
          </tspan>
        ))}
      </text>
      {value != undefined && (
        <text
          x={centerX}
          y={valueCenterY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#452304"
          fontSize={VALUE_FONT_SIZE}
          fontWeight={700}
          fontFamily={CARD_TEXT_FONT_FAMILY}
        >
          {value}
        </text>
      )}
    </Layer>
  );
}
