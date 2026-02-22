/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import BlueprintRenderer from "@/components/BlueprintRenderer";
import { waitForAssetElements } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";
import { getCopyrightBounds } from "@/data/blueprints";
import { computeAverageLuminance } from "@/lib/color-contrast";
import {
  resolveCardPreviewFileName,
} from "@/lib/card-preview";
import { collectCardAssetIds } from "@/lib/card-assets";
import { buildAssetCache } from "@/lib/export-assets-cache";
import {
  endExportLogging,
  logCardInfo,
  logCardRender,
  logCardSkip,
  logCardWait,
  logDeviceInfo,
  logAssetPrefetch,
  logSummary,
  startExportLogging,
} from "@/lib/export-logging";
import { renderSvgToCanvas } from "@/lib/render-svg-to-canvas";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";

import styles from "./CardPreview.module.css";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewHandle, CardPreviewProps } from "./types";

const CardPreview = forwardRef<CardPreviewHandle, CardPreviewProps>(
  (
    {
      templateId,
      templateName,
      backgroundSrc,
      cardData,
      copyrightTextColor: copyrightTextColorProp,
    },
    ref,
  ) => {
    const { t } = useI18n();
    const background = backgroundSrc ?? parchmentBackground;
    const [backgroundLoaded, setBackgroundLoaded] = useState(false);
    const [copyrightTextColor, setCopyrightTextColor] = useState<string | undefined>(
      copyrightTextColorProp,
    );
    const backgroundLoadedRef = useRef(false);
    const backgroundWaitersRef = useRef<(() => void)[]>([]);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      setBackgroundLoaded(false);
      backgroundLoadedRef.current = false;
      if (backgroundWaitersRef.current.length) {
        backgroundWaitersRef.current.splice(0);
      }

      const img = new Image();
      img.src = background.src;
      const handleLoad = () => {
        backgroundLoadedRef.current = true;
        setBackgroundLoaded(true);
        if (backgroundWaitersRef.current.length) {
          backgroundWaitersRef.current.splice(0).forEach((resolve) => resolve());
        }
      };
      img.addEventListener("load", handleLoad);

      return () => {
        img.removeEventListener("load", handleLoad);
      };
    }, [background.src]);

    const syncCopyrightContrast = useMemo(() => {
      return async (options?: { width?: number; height?: number }) => {
        if (!templateId || !cardData) {
          setCopyrightTextColor(undefined);
          return;
        }
        const width = options?.width ?? 300;
        const height = options?.height ?? 420;
        const svgElement = svgRef.current;
        if (!svgElement) {
          setCopyrightTextColor(undefined);
          return;
        }
        const canvas = await renderSvgToCanvas({
          svgElement,
          width,
          height,
          existingCanvas: canvasRef.current,
          removeDebugBounds: true,
        });
        if (!canvas) {
          setCopyrightTextColor(undefined);
          return;
        }
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCopyrightTextColor(undefined);
          return;
        }
        const bounds = getCopyrightBounds(templateId);
        const scaleX = width / CARD_WIDTH;
        const scaleY = height / CARD_HEIGHT;
        const x = Math.max(0, Math.floor(bounds.x * scaleX));
        const y = Math.max(0, Math.floor(bounds.y * scaleY));
        const w = Math.max(1, Math.floor(bounds.width * scaleX));
        const h = Math.max(1, Math.floor(bounds.height * scaleY));
        const sampleWidth = Math.min(canvas.width - x, w);
        const sampleHeight = Math.min(canvas.height - y, h);
        if (sampleWidth <= 0 || sampleHeight <= 0) {
          setCopyrightTextColor(undefined);
          return;
        }
        const imageData = ctx.getImageData(x, y, sampleWidth, sampleHeight);
        const luminance = computeAverageLuminance(imageData);
        if (luminance < 0.45) {
          setCopyrightTextColor("#f5efe1");
        } else {
          setCopyrightTextColor(undefined);
        }
      };
    }, [cardData, templateId]);

    useEffect(() => {
      if (typeof copyrightTextColorProp === "string") {
        setCopyrightTextColor(copyrightTextColorProp);
      } else if (copyrightTextColorProp === undefined) {
        setCopyrightTextColor(undefined);
      }
    }, [copyrightTextColorProp]);

    useEffect(() => {
      if (!backgroundLoaded) return;
      void syncCopyrightContrast();
    }, [backgroundLoaded, syncCopyrightContrast]);

    useImperativeHandle(
      ref,
      () => ({
        async exportAsPng() {
          const session = startExportLogging({ mode: "single", totalCards: 1 });
          logDeviceInfo(session);

          let renders = 0;
          let failures = 0;

          try {
            const svgElement = svgRef.current;
            if (!svgElement) {
              failures += 1;
              return;
            }

            const title = (cardData as { title?: string })?.title ?? templateName ?? "card";
            const face = (cardData as { face?: string })?.face ?? "unknown";
            const imageAssetId = (cardData as { imageAssetId?: string })?.imageAssetId;
            const imageAssetName = (cardData as { imageAssetName?: string })?.imageAssetName;
            const iconAssetId = (cardData as { iconAssetId?: string })?.iconAssetId;
            const iconAssetName = (cardData as { iconAssetName?: string })?.iconAssetName;

            logCardInfo(session, {
              cardId: "active",
              title,
              templateId: templateId ?? "unknown",
              face,
              imageAsset: { id: imageAssetId, name: imageAssetName },
              iconAsset: { id: iconAssetId, name: iconAssetName },
            });

            await this.waitForBackgroundLoaded?.();
            await this.syncCopyrightContrast?.();

            const assetIds = collectCardAssetIds(cardData);
            const { cache, missing } = await buildAssetCache(assetIds);
            logAssetPrefetch(session, {
              total: assetIds.length,
              cached: cache.size,
              missing: missing.size,
            });
            const missingAssets: { label: string; id: string; name?: string | null }[] = [];
            if (imageAssetId && missing.has(imageAssetId)) {
              missingAssets.push({
                label: "image",
                id: imageAssetId,
                name: imageAssetName ?? null,
              });
            }
            if (iconAssetId && missing.has(iconAssetId)) {
              missingAssets.push({
                label: "icon",
                id: iconAssetId,
                name: iconAssetName ?? null,
              });
            }
            if (missingAssets.length > 0) {
              failures += 1;
              const missingSummary = missingAssets
                .map(
                  (asset) =>
                    `${asset.label} asset "${asset.name ?? "unknown"}" (id=${asset.id})`,
                )
                .join(", ");
              logCardSkip(session, { reason: `Missing ${missingSummary}` });
              return;
            }

            const now = () =>
              typeof performance !== "undefined" ? performance.now() : Date.now();

            const waitStart = now();
            if (assetIds.length) {
              await waitForAssetElements(() => svgRef.current, assetIds);
            }
            logCardWait(session, { durationMs: now() - waitStart });

            const renderStart = now();
            const canvas = await renderSvgToCanvas({
              svgElement,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              existingCanvas: canvasRef.current,
              removeDebugBounds: true,
              loggingId: session.sessionId,
              assetBlobsById: cache,
            });
            renders += 1;
            if (canvas) {
              canvasRef.current = canvas;
            }
            if (!canvas) {
              failures += 1;
              logCardRender(session, { durationMs: now() - renderStart, success: false });
              return;
            }
            const pngBlob: Blob | null = await new Promise((resolve) =>
              canvas.toBlob((blob) => resolve(blob), "image/png", 1),
            );
            const renderDuration = now() - renderStart;
            const success = Boolean(pngBlob);
            logCardRender(session, { durationMs: renderDuration, success });
            if (!pngBlob) {
              failures += 1;
              return;
            }

            const pngUrl = URL.createObjectURL(pngBlob);

            const link = document.createElement("a");
            link.href = pngUrl;
            link.download = resolveCardPreviewFileName(cardData as { title?: string }, templateName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
            void openDownloadsFolderIfTauri();
          } finally {
            const endedAt = Date.now();
            logSummary(session, {
              endedAt,
              totalMs: endedAt - session.startedAt,
              cards: 1,
              renders,
              failures,
            });
            endExportLogging(session);
          }
        },
        async renderToPngBlob(options) {
          const svgElement = svgRef.current;
          if (!svgElement) return null;

          await this.waitForBackgroundLoaded?.();
          await this.syncCopyrightContrast?.();

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;

          const canvas = await renderSvgToCanvas({
            svgElement,
            width,
            height,
            existingCanvas: canvasRef.current,
            removeDebugBounds: true,
            loggingId: options?.loggingId,
            assetBlobsById: options?.assetBlobsById,
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

          await this.waitForBackgroundLoaded?.();

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;
          const removeDebugBounds = options?.removeDebugBounds ?? true;

          const canvas = await renderSvgToCanvas({
            svgElement,
            width,
            height,
            existingCanvas: canvasRef.current,
            removeDebugBounds,
          });
          if (canvas) {
            canvasRef.current = canvas;
          }
          return canvas;
        },
        getSvgElement() {
          return svgRef.current;
        },
        async syncCopyrightContrast(options) {
          await syncCopyrightContrast(options);
        },
        waitForBackgroundLoaded(timeoutMs = 3000) {
          if (backgroundLoadedRef.current) return Promise.resolve();
          return new Promise((resolve) => {
            const handleResolve = () => resolve();
            backgroundWaitersRef.current.push(handleResolve);
            window.setTimeout(() => {
              const index = backgroundWaitersRef.current.indexOf(handleResolve);
              if (index >= 0) {
                backgroundWaitersRef.current.splice(index, 1);
              }
              resolve();
            }, timeoutMs);
          });
        },
      }),
      [cardData, templateName, syncCopyrightContrast],
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
                copyrightTextColor={copyrightTextColor}
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
