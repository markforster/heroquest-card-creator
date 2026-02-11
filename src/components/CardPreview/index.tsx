/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import BlueprintRenderer from "@/components/BlueprintRenderer";
import { useI18n } from "@/i18n/I18nProvider";
import {
  resolveCardPreviewFileName,
} from "@/lib/card-preview";
import { renderSvgToCanvas } from "@/lib/render-svg-to-canvas";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";

import styles from "./CardPreview.module.css";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewHandle, CardPreviewProps } from "./types";

const CardPreview = forwardRef<CardPreviewHandle, CardPreviewProps>(
  ({ templateId, templateName, backgroundSrc, cardData }, ref) => {
    const { t } = useI18n();
    const background = backgroundSrc ?? parchmentBackground;
    const [backgroundLoaded, setBackgroundLoaded] = useState(false);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    useImperativeHandle(
      ref,
      () => ({
        async exportAsPng() {
          const svgElement = svgRef.current;
          if (!svgElement) return;

          const canvas = await renderSvgToCanvas({
            svgElement,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            existingCanvas: canvasRef.current,
          });
          if (canvas) {
            canvasRef.current = canvas;
          }
          if (!canvas) return;
          const pngBlob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/png", 1),
          );
          if (!pngBlob) return;

          const pngUrl = URL.createObjectURL(pngBlob);

          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = resolveCardPreviewFileName(cardData as { title?: string }, templateName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          void openDownloadsFolderIfTauri();
        },
        async renderToPngBlob(options) {
          const svgElement = svgRef.current;
          if (!svgElement) return null;

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;

          const canvas = await renderSvgToCanvas({
            svgElement,
            width,
            height,
            existingCanvas: canvasRef.current,
          });
          if (canvas) {
            canvasRef.current = canvas;
          }
          if (!canvas) return null;
          const pngBlob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/png", 1),
          );
          return pngBlob ?? null;
        },
        async renderToCanvas(options) {
          const svgElement = svgRef.current;
          if (!svgElement) return null;

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;

          const canvas = await renderSvgToCanvas({
            svgElement,
            width,
            height,
            existingCanvas: canvasRef.current,
          });
          if (canvas) {
            canvasRef.current = canvas;
          }
          return canvas;
        },
        getSvgElement() {
          return svgRef.current;
        },
      }),
      [cardData, templateName],
    );

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
            aria-label={
              templateName
                ? `${t("aria.previewOf")} ${templateName} ${t("aria.card")}`
                : t("aria.cardPreview")
            }
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
            <g clipPath="url(#cardClip)">
              <BlueprintRenderer
                templateId={templateId}
                templateName={templateName}
                background={background}
                backgroundLoaded={backgroundLoaded}
                cardData={cardData}
              />
            </g>
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
export type { CardPreviewHandle, CardPreviewProps } from "./types";
