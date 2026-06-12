"use client";

import { setExportBackgroundFit, setExportClip } from "@/lib/bleed-export";

import { CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewProps } from "./types";

export type ExportSvgMutationOptions = {
  mode: "standard" | "bleed-full" | "bleed-source";
  roundedCorners?: boolean;
  bleedPx?: number;
  cropMarksEnabled?: boolean;
  developerCreditEnabled?: boolean;
  templateId?: CardPreviewProps["templateId"];
};

function removeDeveloperCreditLayer(svg: SVGSVGElement) {
  svg.querySelectorAll('[data-layer-type="developer-credit"]').forEach((node) => node.remove());
}

function applyExportImageClip(svg: SVGSVGElement) {
  const existing = svg.querySelector("clipPath#exportImageClip");
  if (!existing) {
    const svgNs = "http://www.w3.org/2000/svg";
    const defs =
      svg.querySelector("defs") ??
      svg.insertBefore(document.createElementNS(svgNs, "defs"), svg.firstChild);
    const clipPath = document.createElementNS(svgNs, "clipPath");
    clipPath.setAttribute("id", "exportImageClip");
    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
    const rect = document.createElementNS(svgNs, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(CARD_WIDTH));
    rect.setAttribute("height", String(CARD_HEIGHT));
    clipPath.appendChild(rect);
    defs.appendChild(clipPath);
  }

  svg.querySelectorAll<SVGImageElement | SVGFEImageElement>("image, feImage").forEach((node) => {
    if (node.hasAttribute("clip-path") || node.hasAttribute("clipPath")) {
      return;
    }
    node.setAttribute("clip-path", "url(#exportImageClip)");
  });
}

function zeroTreasureBorderOffsetsForExport(svg: SVGSVGElement) {
  svg
    .querySelectorAll<SVGImageElement | SVGFEImageElement>(
      '[data-template-asset="border-mask"], [data-template-asset="border-texture"]',
    )
    .forEach((node) => {
      node.setAttribute("x", "0");
      node.setAttribute("y", "0");
    });
}

export function mutateSvgForExport(
  svg: SVGSVGElement,
  {
    mode,
    roundedCorners = true,
    bleedPx = 0,
    cropMarksEnabled = false,
    developerCreditEnabled = false,
    templateId,
  }: ExportSvgMutationOptions,
) {
  if (mode !== "standard") {
    const cardClipRect = svg.querySelector<SVGRectElement>("clipPath#cardClip rect");
    if (cardClipRect) {
      cardClipRect.setAttribute("x", "0");
      cardClipRect.setAttribute("y", "0");
      cardClipRect.setAttribute("width", String(CARD_WIDTH));
      cardClipRect.setAttribute("height", String(CARD_HEIGHT));
      cardClipRect.setAttribute("rx", "0");
      cardClipRect.setAttribute("ry", "0");
    }
  }

  const outline = svg.querySelector('[data-card-outline="true"]');
  if (outline) {
    outline.remove();
  }

  if (bleedPx > 0 || cropMarksEnabled) {
    setExportBackgroundFit(svg, "slice");
  }

  if (mode !== "bleed-source") {
    setExportClip(svg, { rounded: roundedCorners });
  }

  if (developerCreditEnabled) {
    removeDeveloperCreditLayer(svg);
  }

  applyExportImageClip(svg);

  if (templateId === "small-treasure" || templateId === "large-treasure") {
    zeroTreasureBorderOffsetsForExport(svg);
  }
}
