/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import BlueprintRenderer from "@/components/BlueprintRenderer";
import { measureCardTextMaxLineWidth } from "@/components/Cards/CardParts/CardTextBlock";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { useLocalStorageBoolean } from "@/components/Providers/LocalStorageProvider";
import { waitForAssetElements } from "@/components/Stockpile/stockpile-utils";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import {
  DEVELOPER_CREDIT_BLEND_COLOR,
  DEVELOPER_CREDIT_BLEND_MODE,
  DEVELOPER_CREDIT_FONT_SCALE,
  DEVELOPER_CREDIT_OPACITY,
  DEVELOPER_CREDIT_RIGHT_INSET,
  DEVELOPER_CREDIT_TOP_INSET,
  DEVELOPER_CREDIT_TEXT,
} from "@/config/developer-credit";
import { ENABLE_WATERMARK, USE_ROUNDED_CARD_CLIP } from "@/config/flags";
import { blueprintsByTemplateId, getCopyrightBounds } from "@/data/blueprints";
import { useI18n } from "@/i18n/I18nProvider";
import {
  composeBleedCanvas,
  cloneSvgForBleed,
  getBleedTrimOrigin,
  setExportBackgroundFit,
  setExportClip,
} from "@/lib/bleed-export";
import { collectCardAssetIds } from "@/lib/card-assets";
import { resolveCardPreviewFileName } from "@/lib/card-preview";
import { computeAverageLuminance } from "@/lib/color-contrast";
import { getSvgImageHref } from "@/lib/dom";
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
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { addPngTextChunk } from "@/lib/png-metadata";
import { renderSvgToCanvas } from "@/lib/render-svg-to-canvas";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";
import { now } from "@/lib/time";
import { applyWatermarkToCanvas, shouldApplyWatermark } from "@/lib/watermark";
import { APP_VERSION } from "@/version";

import styles from "./CardPreview.module.css";
import { CARD_CLIP_INSET, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./consts";

import type { CardPreviewHandle, CardPreviewProps } from "./types";


function normalizeCopyrightColor(value?: string) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveCopyrightTextStyle(templateId?: CardPreviewProps["templateId"]) {
  if (!templateId) {
    return {
      fontSize: 16,
      fontWeight: undefined as number | string | undefined,
      fontFamily: "Helvetica, Arial, sans-serif",
      letterSpacingEm: undefined as number | undefined,
      fill: DEFAULT_COPYRIGHT_COLOR,
    };
  }
  const blueprint = blueprintsByTemplateId[templateId];
  const layer = blueprint?.layers.find((entry) => entry.type === "copyright");
  const layerProps = layer?.props ?? {};
  const fontSize = typeof layerProps.fontSize === "number" ? layerProps.fontSize : 16;
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
  const fill = typeof layerProps.fill === "string" ? layerProps.fill : DEFAULT_COPYRIGHT_COLOR;
  return { fontSize, fontWeight, fontFamily, letterSpacingEm, fill };
}

function removeDeveloperCreditLayer(svg: SVGSVGElement) {
  svg.querySelectorAll('[data-layer-type="developer-credit"]').forEach((node) => node.remove());
}

function applyExportImageClip(svg: SVGSVGElement) {
  const existing = svg.querySelector("clipPath#exportImageClip");
  if (!existing) {
    const svgNs = "http://www.w3.org/2000/svg";
    const defs = svg.querySelector("defs") ?? svg.insertBefore(document.createElementNS(svgNs, "defs"), svg.firstChild);
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

  svg
    .querySelectorAll<SVGImageElement | SVGFEImageElement>("image, feImage")
    .forEach((node) => {
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

type ExportSvgMutationOptions = {
  mode: "standard" | "bleed-full" | "bleed-source";
  roundedCorners?: boolean;
  bleedPx?: number;
  cropMarksEnabled?: boolean;
  developerCreditEnabled?: boolean;
  templateId?: CardPreviewProps["templateId"];
};

function mutateSvgForExport(
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

function shouldShowDeveloperCredit(
  templateId?: CardPreviewProps["templateId"],
  cardData?: CardPreviewProps["cardData"],
) {
  return Boolean(templateId && cardData);
}

function drawDeveloperCredit({
  canvas,
  templateId,
  cardData,
  bleedPx,
  cropMarks,
  cutMarks,
}: {
  canvas: HTMLCanvasElement;
  templateId?: CardPreviewProps["templateId"];
  cardData?: CardPreviewProps["cardData"];
  bleedPx: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
  cutMarks?: { enabled: boolean; color: string };
}) {
  if (!shouldShowDeveloperCredit(templateId, cardData)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const style = resolveCopyrightTextStyle(templateId);
  const fontSize = Math.max(1, Math.round(style.fontSize * DEVELOPER_CREDIT_FONT_SCALE));
  const effectiveTopInset = Math.max(DEVELOPER_CREDIT_TOP_INSET, CARD_CORNER_RADIUS + 2);
  const fontWeight = "400";
  const fontFamily = CARD_TEXT_FONT_FAMILY;
  ctx.font = `${fontWeight ? `${fontWeight} ` : ""}${fontSize}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = DEVELOPER_CREDIT_BLEND_COLOR;

  const { trimX, trimY } = getBleedTrimOrigin({
    bleedPx,
    cropMarks,
    cutMarks,
  });
  const { maxLineWidth } = measureCardTextMaxLineWidth({
    text: DEVELOPER_CREDIT_TEXT,
    width: CARD_HEIGHT,
    fontSize,
    lineHeight: fontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm: undefined,
    defaultAlign: "left",
  });
  const x = trimX + CARD_WIDTH - DEVELOPER_CREDIT_RIGHT_INSET;
  const y = trimY + effectiveTopInset + Math.max(0, Math.floor(maxLineWidth));
  ctx.save();
  ctx.globalCompositeOperation = DEVELOPER_CREDIT_BLEND_MODE as GlobalCompositeOperation;
  ctx.globalAlpha = DEVELOPER_CREDIT_OPACITY;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(DEVELOPER_CREDIT_TEXT, 0, 0);
  ctx.restore();
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
    const [developerCreditDisabled] = useLocalStorageBoolean("hqcc.developerCreditDisabled", false);
    const developerCreditEnabled = !developerCreditDisabled;
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
      key: string;
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
        const width = options?.width ?? 300;
        const height = options?.height ?? 420;
        const svgElement = svgRef.current;
        if (!svgElement) {
          setCopyrightTextColor(undefined);
          return;
        }
        const resolvedText = (() => {
          const copyrightValue = (cardData as { copyright?: string }).copyright;
          const overrideValue = typeof copyrightValue === "string" ? copyrightValue : "";
          const normalizedOverride = overrideValue.trim();
          const normalizedDefault = defaultCopyright.trim();
          return normalizedOverride.length > 0
            ? normalizedOverride
            : normalizedDefault.length > 0
              ? normalizedDefault
              : "";
        })();
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

        const sampleTextContrastColor = async ({
          bounds,
          text,
          fontSize,
          lineHeight,
          fontWeight,
          fontFamily,
          letterSpacingEm,
          align,
          allowBackgroundShortcut,
          cacheKey,
        }: {
          bounds: { x: number; y: number; width: number; height: number };
          text: string;
          fontSize: number;
          lineHeight?: number;
          fontWeight?: number | string;
          fontFamily: string;
          letterSpacingEm?: number;
          align: "left" | "center" | "right";
          allowBackgroundShortcut: boolean;
          cacheKey: string;
        }) => {
          const sampleSvg = (() => {
            try {
              const cloned = svgElement.cloneNode(true) as SVGSVGElement;
              cloned.querySelector('[data-layer-type="copyright"]')?.remove();
              cloned.querySelector('[data-layer-type="developer-credit"]')?.remove();
              return cloned;
            } catch {
              return svgElement;
            }
          })();
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
            text,
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

          const sampleLuminanceShifted = (
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
            const targetX = rectX;
            const targetY = shiftedY;
            const targetW = rectW;
            const targetH = shiftedH;
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
            try {
              const imageData = ctx.getImageData(
                Math.floor(sampleX),
                Math.floor(sampleY),
                Math.floor(sampleW),
                Math.floor(sampleH),
              );
              return computeAverageLuminance(imageData);
            } catch {
              return null;
            }
          };

          const computeLuminance = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
            const leftWidth = Math.max(0, Math.floor(textLeft - x));
            const rightStart = Math.floor(textLeft + textWidthPx);
            const rightWidth = Math.max(0, Math.floor(x + w - rightStart));
            const leftLum = sampleLuminanceShifted(ctx, canvas, x, y, leftWidth, h);
            const rightLum = sampleLuminanceShifted(ctx, canvas, rightStart, y, rightWidth, h);
            return (
              (leftLum != null && rightLum != null
                ? (leftLum + rightLum) / 2
                : (leftLum ?? rightLum)) ?? sampleLuminanceShifted(ctx, canvas, x, y, w, h)
            );
          };

          if (allowBackgroundShortcut) {
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
                  cached &&
                  cached.src === resolvedHref &&
                  cached.key === cacheKey &&
                  cached.width === width &&
                  cached.height === height;
                const canvas = reuse ? cached.canvas : document.createElement("canvas");
                if (!reuse) {
                  canvas.width = width;
                  canvas.height = height;
                }
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
                  backgroundSampleRef.current = {
                    src: resolvedHref,
                    key: cacheKey,
                    width,
                    height,
                    canvas,
                  };
                  const luminance = computeLuminance(ctx, canvas);
                  if (luminance != null) {
                    return luminance < COPYRIGHT_LUMINANCE_THRESHOLD ? "#f5efe1" : undefined;
                  }
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
          if (!canvas) return undefined;
          sampleCanvasRef.current = canvas;
          const ctx = canvas.getContext("2d");
          if (!ctx) return undefined;
          const luminance = computeLuminance(ctx, canvas);
          if (luminance == null) return undefined;
          return luminance < COPYRIGHT_LUMINANCE_THRESHOLD ? "#f5efe1" : undefined;
        };

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
          layerProps.align === "left" ||
          layerProps.align === "right" ||
          layerProps.align === "center"
            ? layerProps.align
            : "center";

        if (showCopyright === false || !resolvedText) {
          setCopyrightTextColor(undefined);
        } else {
          const isFileProtocol =
            typeof window !== "undefined" && window.location.protocol === "file:";
          const bounds = getCopyrightBounds(templateId);
          const copyrightColor = await sampleTextContrastColor({
            bounds,
            text: resolvedText,
            fontSize,
            lineHeight,
            fontWeight,
            fontFamily,
            letterSpacingEm,
            align,
            allowBackgroundShortcut: !isFileProtocol,
            cacheKey: `copyright-${bounds.x}-${bounds.y}-${bounds.width}-${bounds.height}`,
          });
          setCopyrightTextColor(copyrightColor);
        }

      };
    }, [
      cardData,
      templateId,
      normalizedCopyrightTextColorProp,
      defaultCopyright,
    ]);

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
        async exportAsPng(options) {
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
                  (asset) => `${asset.label} asset "${asset.name ?? "unknown"}" (id=${asset.id})`,
                )
                .join(", ");
              logCardSkip(session, { reason: `Missing ${missingSummary}` });
              return;
            }


            const waitStart = now();
            if (assetIds.length) {
              await waitForAssetElements(() => svgRef.current, assetIds);
            }
            logCardWait(session, { durationMs: now() - waitStart });

            const renderStart = now();
            const bleedPx = options?.bleedPx ?? 0;
            const cropMarks = options?.cropMarks;
            const cutMarks = options?.cutMarks;
            const requestedRounded = options?.roundedCorners ?? true;
            const effectiveRounded = requestedRounded && bleedPx === 0 && !cropMarks?.enabled;
            const canvas =
              bleedPx > 0 || cropMarks?.enabled || cutMarks?.enabled
                ? await renderBleedCanvas({
                    svgElement,
                    bleedPx,
                    cropMarks: cropMarks
                      ? {
                          ...cropMarks,
                          style: cropMarks.style ?? "lines",
                        }
                      : cropMarks,
                    cutMarks: cutMarks
                      ? {
                          enabled: cutMarks.enabled,
                          color: cutMarks.color,
                        }
                      : cutMarks,
                    roundedCorners: effectiveRounded,
                    loggingId: session.sessionId,
                    assetBlobsById: cache,
                    templateId,
                    developerCreditEnabled,
                  })
                : await renderSvgToCanvas({
                    svgElement,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    existingCanvas: canvasRef.current,
                    removeDebugBounds: true,
                    loggingId: session.sessionId,
                    assetBlobsById: cache,
                    mutateSvg: (svg) =>
                      mutateSvgForExport(svg, {
                        mode: "standard",
                        roundedCorners: effectiveRounded,
                        developerCreditEnabled,
                        templateId,
                      }),
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
            if (
              ENABLE_WATERMARK &&
              shouldApplyWatermark(templateId) &&
              !(bleedPx > 0 || cropMarks?.enabled)
            ) {
              applyWatermarkToCanvas(canvas);
            }
            if (developerCreditEnabled) {
              drawDeveloperCredit({
                canvas,
                templateId,
                cardData,
                bleedPx,
                cropMarks,
                cutMarks,
              });
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
            link.download = resolveCardPreviewFileName(
              cardData as { title?: string },
              templateName,
            );
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
          const bleedPx = options?.bleedPx ?? 0;
          const cropMarks = options?.cropMarks;
          const cutMarks = options?.cutMarks;
          const requestedRounded = options?.roundedCorners ?? true;
          const effectiveRounded = requestedRounded && bleedPx === 0 && !cropMarks?.enabled;

          const canvas =
            bleedPx > 0 || cropMarks?.enabled || cutMarks?.enabled
              ? await renderBleedCanvas({
                  svgElement,
                  bleedPx,
                  cropMarks: cropMarks
                    ? {
                        ...cropMarks,
                        style: cropMarks.style ?? "lines",
                      }
                    : cropMarks,
                  cutMarks: cutMarks
                    ? {
                        enabled: cutMarks.enabled,
                        color: cutMarks.color,
                      }
                    : cutMarks,
                  roundedCorners: effectiveRounded,
                  loggingId: options?.loggingId,
                  assetBlobsById: options?.assetBlobsById,
                  templateId,
                  developerCreditEnabled,
                })
              : await renderSvgToCanvas({
                  svgElement,
                  width,
                  height,
                  existingCanvas: canvasRef.current,
                  removeDebugBounds: true,
                  loggingId: options?.loggingId,
                  assetBlobsById: options?.assetBlobsById,
                  mutateSvg: (svg) =>
                    mutateSvgForExport(svg, {
                      mode: "standard",
                      roundedCorners: effectiveRounded,
                      developerCreditEnabled,
                      templateId,
                    }),
                });
          if (canvas) {
            canvasRef.current = canvas;
          }
          if (!canvas) return null;
          if (
            ENABLE_WATERMARK &&
            shouldApplyWatermark(templateId) &&
            !(bleedPx > 0 || cropMarks?.enabled)
          ) {
            applyWatermarkToCanvas(canvas);
          }
          if (developerCreditEnabled) {
            drawDeveloperCredit({
              canvas,
              templateId,
              cardData,
              bleedPx,
              cropMarks,
              cutMarks,
            });
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
        async renderToJpegBlob(options) {
          const svgElement = svgRef.current;
          if (!svgElement) return null;

          await this.waitForBackgroundLoaded?.();
          await this.syncCopyrightContrast?.();

          const width = options?.width ?? CARD_WIDTH;
          const height = options?.height ?? CARD_HEIGHT;
          const bleedPx = options?.bleedPx ?? 0;
          const cropMarks = options?.cropMarks;
          const cutMarks = options?.cutMarks;
          const requestedRounded = options?.roundedCorners ?? true;
          const effectiveRounded = requestedRounded && bleedPx === 0 && !cropMarks?.enabled;

          const canvas =
            bleedPx > 0 || cropMarks?.enabled || cutMarks?.enabled
              ? await renderBleedCanvas({
                  svgElement,
                  bleedPx,
                  cropMarks: cropMarks
                    ? {
                        ...cropMarks,
                        style: cropMarks.style ?? "lines",
                      }
                    : cropMarks,
                  cutMarks: cutMarks
                    ? {
                        enabled: cutMarks.enabled,
                        color: cutMarks.color,
                      }
                    : cutMarks,
                  roundedCorners: effectiveRounded,
                  loggingId: options?.loggingId,
                  assetBlobsById: options?.assetBlobsById,
                  templateId,
                  developerCreditEnabled,
                })
              : await renderSvgToCanvas({
                  svgElement,
                  width,
                  height,
                  existingCanvas: canvasRef.current,
                  removeDebugBounds: true,
                  loggingId: options?.loggingId,
                  assetBlobsById: options?.assetBlobsById,
                  mutateSvg: (svg) =>
                    mutateSvgForExport(svg, {
                      mode: "standard",
                      roundedCorners: effectiveRounded,
                      developerCreditEnabled,
                      templateId,
                    }),
                });
          if (canvas) {
            canvasRef.current = canvas;
          }
          if (!canvas) return null;
          if (
            ENABLE_WATERMARK &&
            shouldApplyWatermark(templateId) &&
            !(bleedPx > 0 || cropMarks?.enabled)
          ) {
            applyWatermarkToCanvas(canvas);
          }
          if (developerCreditEnabled) {
            drawDeveloperCredit({
              canvas,
              templateId,
              cardData,
              bleedPx,
              cropMarks,
              cutMarks,
            });
          }
          const jpegBlob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8),
          );
          return jpegBlob ?? null;
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
      [
        cardData,
        templateId,
        templateName,
        syncCopyrightContrast,
        developerCreditEnabled,
      ],
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
                developerCreditEnabled={developerCreditEnabled}
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
              data-card-outline="true"
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

async function renderBleedCanvas({
  svgElement,
  bleedPx,
  cropMarks,
  cutMarks,
  roundedCorners,
  loggingId,
  assetBlobsById,
  templateId,
  developerCreditEnabled,
}: {
  svgElement: SVGSVGElement;
  bleedPx: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
  cutMarks?: { enabled: boolean; color: string };
  roundedCorners: boolean;
  loggingId?: string;
  assetBlobsById?: Map<string, Blob>;
  templateId?: CardPreviewProps["templateId"];
  developerCreditEnabled?: boolean;
}): Promise<HTMLCanvasElement | null> {
  const fullCanvas = await renderSvgToCanvas({
    svgElement,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    removeDebugBounds: true,
    loggingId,
    assetBlobsById,
    mutateSvg: (svg) =>
      mutateSvgForExport(svg, {
        mode: "bleed-full",
        roundedCorners,
        bleedPx,
        cropMarksEnabled: Boolean(cropMarks?.enabled),
        developerCreditEnabled,
        templateId,
      }),
  });
  if (!fullCanvas) return null;
  if (ENABLE_WATERMARK && shouldApplyWatermark(templateId)) {
    applyWatermarkToCanvas(fullCanvas);
  }

  let bleedSourceCanvas: HTMLCanvasElement | null = null;
  if (bleedPx > 0) {
    bleedSourceCanvas = await renderSvgToCanvas({
      svgElement,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      removeDebugBounds: true,
      loggingId,
      assetBlobsById,
      mutateSvg: (svg) =>
        mutateSvgForExport(svg, {
          mode: "bleed-source",
          bleedPx,
          cropMarksEnabled: Boolean(cropMarks?.enabled),
          developerCreditEnabled,
          templateId,
        }),
    });
  }

  return composeBleedCanvas({
    fullCanvas,
    backgroundCanvas: bleedSourceCanvas,
    bleedPx,
    cropMarks,
    cutMarks: cutMarks
      ? {
          enabled: cutMarks.enabled,
          color: cutMarks.color,
        }
      : cutMarks,
  });
}

export default CardPreview;
export type { CardPreviewHandle, CardPreviewProps } from "./types";
