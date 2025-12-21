/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import { templateComponentsById } from "@/data/card-templates";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import styles from "./CardPreview.module.css";

import type { StaticImageData } from "next/image";

type CardPreviewProps = {
  templateId?: TemplateId;
  templateName?: string;
  backgroundSrc?: StaticImageData;
  cardData?: CardDataByTemplate[TemplateId];
};

export type CardPreviewHandle = {
  exportAsPng: () => Promise<void>;
  renderToPngBlob: (options?: { width?: number; height?: number }) => Promise<Blob | null>;
};

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;
const CARD_CLIP_INSET = 2;
const CARD_CORNER_RADIUS = 28;

let cachedEmbeddedFontCss: string | null = null;

async function getEmbeddedFontCss(): Promise<string | null> {
  if (cachedEmbeddedFontCss) {
    return cachedEmbeddedFontCss;
  }

  const fontConfigs = [
    { path: "fonts/Carter Sans W01 Regular.ttf", weight: 400 },
    { path: "fonts/Carter Sans W01 Medium.ttf", weight: 550 },
    { path: "fonts/Carter Sans W01 Bold.ttf", weight: 700 },
  ];

  try {
    const rules = await Promise.all(
      fontConfigs.map(async ({ path, weight }) => {
        const baseUrl = new URL(".", window.location.href).toString();
        const response = await fetch(new URL(path, baseUrl).toString());
        const blob = await response.blob();

        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read font blob"));
          reader.readAsDataURL(blob);
        });

        return `
@font-face {
  font-family: "Carter Sans W01";
  src: url("${dataUrl}") format("truetype");
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
}`;
      }),
    );

    cachedEmbeddedFontCss = rules.join("\n");
    return cachedEmbeddedFontCss;
  } catch {
    return null;
  }
}

const CardPreview = forwardRef<CardPreviewHandle, CardPreviewProps>(
  ({ templateId, templateName, backgroundSrc, cardData }, ref) => {
    const background = backgroundSrc ?? parchmentBackground;
    const [backgroundLoaded, setBackgroundLoaded] = useState(false);
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
      setBackgroundLoaded(false);

      const img = new Image();
      img.src = background.src;
      const handleLoad = () => {
        setBackgroundLoaded(true);
      };
      img.addEventListener("load", handleLoad);

      return () => {
        img.removeEventListener("load", handleLoad);
      };
    }, [background.src]);

    async function renderSvgToPngBlob(
      svgElement: SVGSVGElement,
      width: number,
      height: number,
    ): Promise<Blob | null> {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      const origin = window.location.origin;
      const images = Array.from(clonedSvg.querySelectorAll("image"));

      await Promise.all(
        images.map(async (imgEl) => {
          const hrefAttr =
            imgEl.getAttribute("href") ??
            imgEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
          if (!hrefAttr || hrefAttr.startsWith("data:")) return;

          let url = hrefAttr;
          if (hrefAttr.startsWith("/")) {
            url = origin + hrefAttr;
          }

          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read image blob"));
              reader.readAsDataURL(blob);
            });

            imgEl.setAttribute("href", dataUrl);
            imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
          } catch {
            if (hrefAttr.startsWith("/")) {
              const absolute = origin + hrefAttr;
              imgEl.setAttribute("href", absolute);
              imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", absolute);
            }
          }
        }),
      );

      const fontCss = await getEmbeddedFontCss();
      if (fontCss) {
        const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = fontCss;
        clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
      }

      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(clonedSvg);

      if (!source.match(/^<svg[^>]+xmlns=/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/xmlns:xlink=/)) {
        source = source.replace(
          /^<svg/,
          '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
        );
      }

      const svgBlob = new Blob([source], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const img = new Image();
        img.src = svgUrl;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load SVG image"));
        });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to get 2D context");
        }

        ctx.drawImage(img, 0, 0, width, height);

        const pngBlob: Blob | null = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to create PNG blob"));
              } else {
                resolve(blob);
              }
            },
            "image/png",
            1,
          );
        });

        return pngBlob;
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        async exportAsPng() {
          const svgElement = svgRef.current;
          if (!svgElement) return;

          const pngBlob = await renderSvgToPngBlob(svgElement, CARD_WIDTH, CARD_HEIGHT);
          if (!pngBlob) return;

          const pngUrl = URL.createObjectURL(pngBlob);

          const resolveFileName = () => {
            const rawTitle =
              (cardData && "title" in cardData && (cardData as { title?: string }).title) ||
              templateName ||
              "card";

            const trimmed = rawTitle.trim();
            const lower = trimmed.toLowerCase();
            const replacedSpaces = lower.replace(/\s+/g, "-");
            const safe = replacedSpaces.replace(/[^a-z0-9\-_.]+/g, "");

            return (safe || "card") + ".png";
          };

          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = resolveFileName();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        },
        async renderToPngBlob(options) {
          const svgElement = svgRef.current;
          if (!svgElement) return null;

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;

          const pngBlob = await renderSvgToPngBlob(svgElement, width, height);
          if (!pngBlob) return null;

          return pngBlob;
        },
      }),
      [cardData, templateName],
    );

    const TemplateComponent = templateId ? templateComponentsById[templateId] : undefined;

    return (
      <div className={styles.root}>
        <div className={styles.frame}>
          <svg
            ref={svgRef}
            className={styles.svg}
            viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
            role="img"
            onContextMenu={(event) => {
              event.preventDefault();
            }}
            aria-label={templateName ? `Preview of ${templateName} card` : "Card preview"}
          >
            <defs>
              <clipPath id="cardClip">
                <rect
                  x={CARD_CLIP_INSET}
                  y={CARD_CLIP_INSET}
                  width={CARD_WIDTH - CARD_CLIP_INSET * 2}
                  height={CARD_HEIGHT - CARD_CLIP_INSET * 2}
                  rx={CARD_CORNER_RADIUS}
                  ry={CARD_CORNER_RADIUS}
                />
              </clipPath>
            </defs>
            {TemplateComponent ? (
              <g clipPath="url(#cardClip)">
                <TemplateComponent
                  templateName={templateName}
                  background={background}
                  backgroundLoaded={backgroundLoaded}
                  cardData={cardData}
                />
              </g>
            ) : null}
            <rect
              x={CARD_CLIP_INSET}
              y={CARD_CLIP_INSET}
              width={CARD_WIDTH - CARD_CLIP_INSET * 2}
              height={CARD_HEIGHT - CARD_CLIP_INSET * 2}
              rx={CARD_CORNER_RADIUS}
              ry={CARD_CORNER_RADIUS}
              fill="none"
              stroke="#fff0"
              strokeWidth={3}
            />
          </svg>
        {!backgroundLoaded ? (
          <div className={styles.spinnerOverlay}>
            <div className={styles.spinner} />
          </div>
        ) : null}
        </div>
      </div>
    );
  },
);

CardPreview.displayName = "CardPreview";

export default CardPreview;
