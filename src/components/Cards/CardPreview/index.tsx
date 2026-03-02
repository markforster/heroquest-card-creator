/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import BlueprintRenderer from "@/components/BlueprintRenderer";
import { measureCardTextMaxLineWidth } from "@/components/Cards/CardParts/CardTextBlock";
import { waitForAssetElements } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";
import { blueprintsByTemplateId, getCopyrightBounds } from "@/data/blueprints";
import { computeAverageLuminance } from "@/lib/color-contrast";
import { getSvgImageHref } from "@/lib/dom";
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
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { applyWatermarkToCanvas, shouldApplyWatermark } from "@/lib/watermark";
import { ENABLE_WATERMARK, USE_ROUNDED_CARD_CLIP } from "@/config/flags";
import { addPngTextChunk } from "@/lib/png-metadata";
import { APP_VERSION } from "@/version";

import styles from "./CardPreview.module.css";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewHandle, CardPreviewProps } from "./types";

function normalizeCopyrightColor(value?: string) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const COPYRIGHT_LUMINANCE_THRESHOLD = 0.52;
const COPYRIGHT_SAMPLE_INSET_RATIO = 0.2;
const COPYRIGHT_SAMPLE_VERTICAL_SHIFT_MULTIPLIER = 1.5;

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
    const { defaultCopyright } = useCopyrightSettings();
    const background = backgroundSrc ?? parchmentBackground;
    const [backgroundLoaded, setBackgroundLoaded] = useState(false);
    const normalizedCopyrightTextColorProp = normalizeCopyrightColor(copyrightTextColorProp);
    const [copyrightTextColor, setCopyrightTextColor] = useState<string | undefined>(
      normalizedCopyrightTextColorProp,
    );
    const backgroundLoadedRef = useRef(false);
    const backgroundWaitersRef = useRef<(() => void)[]>([]);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const backgroundSampleRef = useRef<{
      src: string;
      width: number;
      height: number;
      canvas: HTMLCanvasElement;
    } | null>(null);
    const backgroundImageCacheRef = useRef<Map<string, Promise<HTMLImageElement>>>(new Map());

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
        if (normalizedCopyrightTextColorProp) {
          setCopyrightTextColor(normalizedCopyrightTextColorProp);
          return;
        }
        const showCopyright =
          typeof (cardData as { showCopyright?: boolean }).showCopyright === "boolean"
            ? (cardData as { showCopyright?: boolean }).showCopyright
            : undefined;
        if (showCopyright === false) {
          setCopyrightTextColor(undefined);
          return;
        }
        const overrideValue =
          typeof (cardData as { copyright?: string }).copyright === "string"
            ? (cardData as { copyright?: string }).copyright
            : "";
        const normalizedOverride = overrideValue.trim();
        const normalizedDefault = defaultCopyright.trim();
        const resolvedText =
          normalizedOverride.length > 0
            ? normalizedOverride
            : normalizedDefault.length > 0
              ? normalizedDefault
              : "";
        if (!resolvedText) {
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
        const sampleSvg = (() => {
          try {
            const cloned = svgElement.cloneNode(true) as SVGSVGElement;
            cloned.querySelector('[data-layer-type="copyright"]')?.remove();
            return cloned;
          } catch {
            return svgElement;
          }
        })();
        const bounds = getCopyrightBounds(templateId);
        const blueprint = blueprintsByTemplateId[templateId];
        const copyrightLayer = blueprint?.layers.find((entry) => entry.type === "copyright");
        const layerProps = copyrightLayer?.props ?? {};
        const fontSize = typeof layerProps.fontSize === "number" ? layerProps.fontSize : 20;
        const lineHeight =
          typeof layerProps.lineHeight === "number" ? layerProps.lineHeight : undefined;
        const fontWeight =
          typeof layerProps.fontWeight === "number" || typeof layerProps.fontWeight === "string"
            ? layerProps.fontWeight
            : undefined;
        const fontFamily =
          typeof layerProps.fontFamily === "string"
            ? layerProps.fontFamily
            : "Helvetica, Arial, sans-serif";
        const letterSpacingEm =
          typeof layerProps.letterSpacingEm === "number" ? layerProps.letterSpacingEm : undefined;
        const align =
          layerProps.align === "left" || layerProps.align === "right" || layerProps.align === "center"
            ? layerProps.align
            : "center";
        const scaleX = width / CARD_WIDTH;
        const scaleY = height / CARD_HEIGHT;
        const resolvedLineHeight = lineHeight ?? fontSize;
        const shiftY = Math.floor(
          resolvedLineHeight * COPYRIGHT_SAMPLE_VERTICAL_SHIFT_MULTIPLIER * scaleY,
        );
        const x = Math.max(0, Math.floor(bounds.x * scaleX));
        const y = Math.max(0, Math.floor(bounds.y * scaleY));
        const w = Math.max(1, Math.floor(bounds.width * scaleX));
        const h = Math.max(1, Math.floor(bounds.height * scaleY));
        const { maxLineWidth } = measureCardTextMaxLineWidth({
          text: resolvedText,
          width: bounds.width,
          fontSize,
          lineHeight,
          fontFamily,
          fontWeight,
          letterSpacingEm,
          defaultAlign: align,
        });
        const textWidthPx = Math.min(w, Math.max(0, Math.floor(maxLineWidth * scaleX)));
        const textLeft =
          align === "right"
            ? x + (w - textWidthPx)
            : align === "center"
              ? x + (w - textWidthPx) / 2
              : x;
        const leftWidth = Math.max(0, Math.floor(textLeft - x));
        const rightStart = Math.floor(textLeft + textWidthPx);
        const rightWidth = Math.max(0, Math.floor(x + w - rightStart));

        const sampleLuminance = (
          ctx: CanvasRenderingContext2D,
          canvas: HTMLCanvasElement,
          rectX: number,
          rectY: number,
          rectW: number,
          rectH: number,
        ) => {
          if (rectW <= 1 || rectH <= 1) return null;
          const shiftedY = Math.max(0, rectY - shiftY);
          const shiftedH = Math.min(rectH, rectY + rectH - shiftedY);
          if (shiftedH <= 1) return null;
          let targetX = rectX;
          let targetY = shiftedY;
          let targetW = rectW;
          let targetH = shiftedH;
          const insetX = Math.floor(rectW * COPYRIGHT_SAMPLE_INSET_RATIO);
          const insetY = Math.floor(shiftedH * COPYRIGHT_SAMPLE_INSET_RATIO);
          let sampleX = targetX + insetX;
          let sampleY = targetY + insetY;
          let sampleW = targetW - insetX * 2;
          let sampleH = targetH - insetY * 2;
          if (sampleW <= 1 || sampleH <= 1) {
            sampleX = targetX;
            sampleY = targetY;
            sampleW = targetW;
            sampleH = targetH;
          }
          if (sampleX < 0) {
            sampleW += sampleX;
            sampleX = 0;
          }
          if (sampleY < 0) {
            sampleH += sampleY;
            sampleY = 0;
          }
          if (sampleX + sampleW > canvas.width) {
            sampleW = canvas.width - sampleX;
          }
          if (sampleY + sampleH > canvas.height) {
            sampleH = canvas.height - sampleY;
          }
          if (sampleW <= 1 || sampleH <= 1) return null;
          const imageData = ctx.getImageData(
            Math.floor(sampleX),
            Math.floor(sampleY),
            Math.floor(sampleW),
            Math.floor(sampleH),
          );
          return computeAverageLuminance(imageData);
        };

        const computeLuminanceFromCanvas = (
          ctx: CanvasRenderingContext2D,
          canvas: HTMLCanvasElement,
        ) => {
          const leftLum = sampleLuminance(ctx, canvas, x, y, leftWidth, h);
          const rightLum = sampleLuminance(ctx, canvas, rightStart, y, rightWidth, h);
          return (
            (leftLum != null && rightLum != null ? (leftLum + rightLum) / 2 : leftLum ?? rightLum) ??
            sampleLuminance(ctx, canvas, x, y, w, h)
          );
        };

        const loadBackgroundImage = async (href: string) => {
          const cache = backgroundImageCacheRef.current;
          if (cache.has(href)) {
            return cache.get(href) ?? null;
          }
          const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load background image"));
            img.src = href;
          });
          cache.set(href, promise);
          try {
            return await promise;
          } catch {
            cache.delete(href);
            return null;
          }
        };

        const resolveBackgroundHref = (href: string) => {
          if (href.startsWith("data:") || href.startsWith("blob:") || href.startsWith("http")) {
            return href;
          }
          if (typeof window === "undefined") return href;
          try {
            return new URL(href, window.location.href).toString();
          } catch {
            return href;
          }
        };

        const backgroundImageEl = sampleSvg.querySelector<SVGImageElement>(
          'image[data-card-background="true"]',
        );
        const backgroundHref = backgroundImageEl ? getSvgImageHref(backgroundImageEl) : null;
        if (backgroundHref) {
          const resolvedHref = resolveBackgroundHref(backgroundHref);
          const img = await loadBackgroundImage(resolvedHref);
          if (img) {
            const cached = backgroundSampleRef.current;
            const reuse =
              cached && cached.src === resolvedHref && cached.width === width && cached.height === height;
            const canvas = reuse ? cached.canvas : document.createElement("canvas");
            if (!reuse) {
              canvas.width = width;
              canvas.height = height;
            }
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const boundsX = bounds.x * scaleX;
              const boundsY = bounds.y * scaleY;
              const boundsW = bounds.width * scaleX;
              const boundsH = bounds.height * scaleY;
              const scale = Math.min(boundsW / img.width, boundsH / img.height);
              const drawW = img.width * scale;
              const drawH = img.height * scale;
              const drawX = boundsX + (boundsW - drawW) / 2;
              const drawY = boundsY + (boundsH - drawH) / 2;
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              backgroundSampleRef.current = { src: resolvedHref, width, height, canvas };
              const luminance = computeLuminanceFromCanvas(ctx, canvas);
              if (luminance != null) {
                if (luminance < COPYRIGHT_LUMINANCE_THRESHOLD) {
                  setCopyrightTextColor("#f5efe1");
                } else {
                  setCopyrightTextColor(undefined);
                }
                return;
              }
            }
          }
        }

        const canvas = await renderSvgToCanvas({
          svgElement: sampleSvg,
          width,
          height,
          existingCanvas: sampleCanvasRef.current,
          removeDebugBounds: true,
        });
        if (!canvas) {
          setCopyrightTextColor(undefined);
          return;
        }
        sampleCanvasRef.current = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCopyrightTextColor(undefined);
          return;
        }
        const luminance = computeLuminanceFromCanvas(ctx, canvas);
        if (luminance == null) {
          setCopyrightTextColor(undefined);
          return;
        }
        if (luminance < COPYRIGHT_LUMINANCE_THRESHOLD) {
          setCopyrightTextColor("#f5efe1");
        } else {
          setCopyrightTextColor(undefined);
        }
      };
    }, [cardData, templateId, normalizedCopyrightTextColorProp, defaultCopyright]);

    useEffect(() => {
      setCopyrightTextColor(normalizedCopyrightTextColorProp);
    }, [normalizedCopyrightTextColorProp]);

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
            if (ENABLE_WATERMARK && shouldApplyWatermark(templateId, cardData)) {
              applyWatermarkToCanvas(canvas);
            }
            let pngBlob: Blob | null = await new Promise((resolve) =>
              canvas.toBlob((blob) => resolve(blob), "image/png", 1),
            );
            const renderDuration = now() - renderStart;
            const success = Boolean(pngBlob);
            logCardRender(session, { durationMs: renderDuration, success });
            if (!pngBlob) {
              failures += 1;
              return;
            }
            pngBlob = await addPngTextChunk(
              pngBlob,
              "Made using",
              `HeroQuest Card Creator ${APP_VERSION}`,
            );

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
          if (ENABLE_WATERMARK && shouldApplyWatermark(templateId, cardData)) {
            applyWatermarkToCanvas(canvas);
          }
          let pngBlob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/png", 1),
          );
          if (!pngBlob) return null;
          pngBlob = await addPngTextChunk(
            pngBlob,
            "Made using",
            `HeroQuest Card Creator ${APP_VERSION}`,
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
        async syncCopyrightContrast(options?: { width?: number; height?: number }) {
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
                  rx={USE_ROUNDED_CARD_CLIP ? CARD_CORNER_RADIUS : 0}
                  ry={USE_ROUNDED_CARD_CLIP ? CARD_CORNER_RADIUS : 0}
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
              rx={USE_ROUNDED_CARD_CLIP ? CARD_CORNER_RADIUS : 0}
              ry={USE_ROUNDED_CARD_CLIP ? CARD_CORNER_RADIUS : 0}
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
