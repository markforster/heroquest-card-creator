"use client";

import { Fragment, type ReactNode } from "react";

import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { PrintConfig } from "@/lib/pdf-export";

type SummaryT = (key: never, options?: Record<string, unknown>) => string;

export function formatDeckPdfLayoutSummary(config: PrintConfig, t: SummaryT): string {
  const parts = [
    config.paper,
    t(
      (config.orientation === "landscape"
        ? "decks.pdf.orientation.landscape"
        : "decks.pdf.orientation.portrait") as never,
    ),
    t(
      (config.mode === "frontAndBack"
        ? "decks.pdf.summary.runMode.frontBack"
        : "decks.pdf.summary.runMode.frontsOnly") as never,
    ),
  ];

  if (config.mode === "frontAndBack") {
    parts.push(
      t(
        (`decks.pdf.duplex.${config.duplexPreset ?? "normal"}` as
          | "decks.pdf.duplex.normal"
          | "decks.pdf.duplex.mirrorX"
          | "decks.pdf.duplex.rotate180"
          | "decks.pdf.duplex.mirrorXRotate180") as never,
      ),
    );
  }

  return parts.join(", ");
}

export function formatDeckPdfBleedSummary(
  bleedOptions: ExportOptionsFormState,
  t: SummaryT,
): ReactNode {
  const parts: ReactNode[] = [];
  let index = 0;

  const pushPart = (content: ReactNode) => {
    if (parts.length > 0) parts.push(", ");
    parts.push(<Fragment key={`part-${index++}`}>{content}</Fragment>);
  };

  const renderColorDot = (color: string) => (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "1.4em",
        height: "1.4em",
        borderRadius: "999px",
        border: "1px solid #000",
        boxSizing: "border-box",
        backgroundColor: color,
        verticalAlign: "middle",
        marginInlineStart: "0.25rem",
      }}
    />
  );

  if (!bleedOptions.bleedEnabled) {
    pushPart(t("decks.pdf.summary.bleed.none" as never));
    if (bleedOptions.roundedCorners) {
      pushPart(t("decks.pdf.summary.bleed.roundedCorners" as never));
    }
  } else {
    pushPart(
      t("decks.pdf.summary.bleed.amount" as never, {
        count: bleedOptions.bleedPx,
      }),
    );

    if (bleedOptions.roundedCorners) {
      pushPart(t("decks.pdf.summary.bleed.roundedCorners" as never));
    }

    if (bleedOptions.cropMarksEnabled) {
      const style = t(
        (bleedOptions.cropMarkStyle === "squares"
          ? "label.cropMarkStyleSquares"
          : bleedOptions.cropMarkStyle === "triangles"
            ? "label.cropMarkStyleTriangles"
            : "label.cropMarkStyleLines") as never,
      ).toLowerCase();
      pushPart(
        <>
          {t("decks.pdf.summary.bleed.cropMarks" as never, {
            style,
          })}{" "}
          {renderColorDot(bleedOptions.cropMarkColor)}
        </>,
      );
    }

    if (bleedOptions.cutMarksEnabled) {
      pushPart(
        <>
          {t("decks.pdf.summary.bleed.cutMarks" as never)} {renderColorDot(bleedOptions.cutMarkColor)}
        </>,
      );
    }
  }

  return parts;
}
