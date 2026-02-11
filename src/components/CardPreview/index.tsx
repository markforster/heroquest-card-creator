/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import BlueprintRenderer from "@/components/BlueprintRenderer";
import { useI18n } from "@/i18n/I18nProvider";
import { getAssetBlob } from "@/lib/assets-db";
import {
  extractFileName,
  guessOriginalFileName,
  readBlobAsDataUrl,
  resolveCardPreviewFileName,
} from "@/lib/card-preview";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";

import styles from "./CardPreview.module.css";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewHandle, CardPreviewProps } from "./types";

let cachedEmbeddedFontCss: string | null = null;

async function getEmbeddedFontCss(): Promise<string | null> {
  if (cachedEmbeddedFontCss) {
    return cachedEmbeddedFontCss;
  }

  try {
    const { embeddedFontFaceCss } = await import("@/generated/embeddedAssets");
    cachedEmbeddedFontCss = embeddedFontFaceCss;
    return cachedEmbeddedFontCss;
  } catch {
    return null;
  }
}

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

    async function renderSvgToCanvas(
      svgElement: SVGSVGElement,
      width: number,
      height: number,
    ): Promise<HTMLCanvasElement | null> {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      const origin = window.location.origin;
      const isFileProtocol = window.location.protocol === "file:";
      const images = Array.from(clonedSvg.querySelectorAll("image"));
      const backgroundImages = Array.from(
        clonedSvg.querySelectorAll('image[data-card-background="true"]'),
      );

      backgroundImages.forEach((imgEl) => {
        imgEl.setAttribute("style", "opacity:1");
        imgEl.setAttribute("opacity", "1");
      });

      let embeddedImagesByFileName: Record<string, string> | null = null;
      try {
        const embedded = await import("@/generated/embeddedAssets");
        embeddedImagesByFileName = embedded.embeddedImagesByFileName;
      } catch {
        embeddedImagesByFileName = null;
      }

      await Promise.all(
        images.map(async (imgEl) => {
          const hrefAttr =
            imgEl.getAttribute("href") ??
            imgEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
          if (!hrefAttr || hrefAttr.startsWith("data:")) return;

          const userAssetId = imgEl.getAttribute("data-user-asset-id");
          if (userAssetId) {
            try {
              const blob = await getAssetBlob(userAssetId);
              if (blob) {
                const dataUrl = await readBlobAsDataUrl(blob);
                imgEl.setAttribute("href", dataUrl);
                imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
              }
            } catch {
              // Fall through to the normal handling.
            }
            return;
          }

          if (embeddedImagesByFileName) {
            const fileName = extractFileName(hrefAttr);
            if (fileName) {
              const candidates = guessOriginalFileName(fileName);
              for (const candidate of candidates) {
                const embedded = embeddedImagesByFileName[candidate];
                if (embedded) {
                  imgEl.setAttribute("href", embedded);
                  imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", embedded);
                  return;
                }
              }
            }
          }

          // When opened via file:// in Chrome/Edge, fetch() is blocked from origin "null" for file
          // resources. At this point we only attempt fetch for blob: URLs (user assets), or for
          // non-file protocols.
          if (isFileProtocol && !hrefAttr.startsWith("blob:")) {
            return;
          }

          let url = hrefAttr;
          if (hrefAttr.startsWith("/")) {
            url = origin + hrefAttr;
          }

          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await readBlobAsDataUrl(blob, "Failed to read image blob");

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
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }

      const svgBlob = new Blob([source], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        let imageBitmap: ImageBitmap | null = null;
        if (typeof createImageBitmap === "function") {
          try {
            imageBitmap = await createImageBitmap(svgBlob);
          } catch {
            imageBitmap = null;
          }
        }

        if (!imageBitmap) {
          const img = new Image();
          img.src = svgUrl;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load SVG image"));
          });

          if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
          }
          const canvas = canvasRef.current;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Unable to get 2D context");
          }

          ctx.drawImage(img, 0, 0, width, height);
          return canvas;
        }

        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to get 2D context");
        }

        ctx.drawImage(imageBitmap, 0, 0, width, height);
        imageBitmap.close();
        return canvas;
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

          const canvas = await renderSvgToCanvas(svgElement, CARD_WIDTH, CARD_HEIGHT);
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

          const canvas = await renderSvgToCanvas(svgElement, width, height);
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

          return await renderSvgToCanvas(svgElement, width, height);
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
