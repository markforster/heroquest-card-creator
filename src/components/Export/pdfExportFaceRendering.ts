"use client";

import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { composeBleedCanvas } from "@/lib/bleed-export";
import { collectCardAssetIds, collectCardHeroBackLogoIds } from "@/lib/card-assets";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { buildAssetCache, buildHeroBackLogoCache } from "@/lib/export-assets-cache";
import type { PrintConfig } from "@/lib/pdf-export";

import type {
  PdfExportPlaceholderSpec,
  PdfExportShellState,
} from "./PdfExportShellModal";
import type { Dispatch, RefObject, SetStateAction } from "react";

type CardRecord = Awaited<ReturnType<typeof import("@/api/client").apiClient.getCard>>;

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png"),
  );
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

function applyBleedToCanvas(
  base: HTMLCanvasElement,
  configForRun: PrintConfig,
  shellState: PdfExportShellState,
): HTMLCanvasElement {
  if (
    shellState.resolvedBleedOptions.bleedPx <= 0 ||
    configForRun.bleedMode !== "bakedInImage"
  ) {
    return base;
  }

  return composeBleedCanvas({
    fullCanvas: base,
    backgroundCanvas: base,
    bleedPx: shellState.resolvedBleedOptions.bleedPx,
    renderBleedBands: false,
    cropMarks: shellState.resolvedBleedOptions.cropMarks,
    cutMarks: shellState.resolvedBleedOptions.cutMarks,
  });
}

export async function renderPdfPlaceholderFacePngBytes({
  spec,
  configForRun,
  shellState,
}: {
  spec: PdfExportPlaceholderSpec;
  configForRun: PrintConfig;
  shellState: PdfExportShellState;
}): Promise<Uint8Array | null> {
  const base = document.createElement("canvas");
  base.width = CARD_WIDTH;
  base.height = CARD_HEIGHT;
  const ctx = base.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, base.width, base.height);
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 1;
  const edgeInset = 0.5;
  const insetX = edgeInset;
  const insetY = edgeInset;
  const borderWidth = base.width - edgeInset * 2;
  const borderHeight = base.height - edgeInset * 2;
  const radius = Math.max(0, CARD_CORNER_RADIUS - edgeInset);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(insetX, insetY, borderWidth, borderHeight, radius);
  }
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 28px sans-serif";
  ctx.fillText(spec.title, base.width / 2, base.height * 0.45);

  if (spec.subtitle) {
    ctx.font = "500 16px sans-serif";
    ctx.fillText(spec.subtitle, base.width / 2, base.height * 0.55);
  }

  const finalCanvas = applyBleedToCanvas(base, configForRun, shellState);
  return canvasToPngBytes(finalCanvas);
}

export async function renderPdfCardFacePngBytes({
  card,
  previewRef,
  setRenderTarget,
  configForRun,
  shellState,
}: {
  card: NonNullable<CardRecord>;
  previewRef: RefObject<CardPreviewHandle | null>;
  setRenderTarget: Dispatch<SetStateAction<CardRecord | null>>;
  configForRun: PrintConfig;
  shellState: PdfExportShellState;
}): Promise<Uint8Array | null> {
  setRenderTarget(card);
  await waitForFrame();
  await waitForFrame();
  await previewRef.current?.waitForBackgroundLoaded?.();
  await previewRef.current?.syncCopyrightContrast?.();

  const cardData = cardRecordToCardData(card as never);
  const assetIds = collectCardAssetIds(cardData);
  const heroBackLogoIds = collectCardHeroBackLogoIds(cardData);
  const { cache } = await buildAssetCache(assetIds);
  const { cache: heroBackLogoCache } = await buildHeroBackLogoCache(heroBackLogoIds);
  if (assetIds.length > 0 || heroBackLogoIds.length > 0) {
    await waitForAssetElements(() => previewRef.current?.getSvgElement(), assetIds, heroBackLogoIds);
  }

  const blob = await previewRef.current?.renderToPngBlob({
    bleedPx:
      configForRun.bleedMode === "bakedInImage" ? shellState.resolvedBleedOptions.bleedPx : 0,
    cropMarks:
      configForRun.bleedMode === "bakedInImage"
        ? shellState.resolvedBleedOptions.cropMarks
        : {
            enabled: false,
            color: shellState.resolvedBleedOptions.cropMarks.color,
            style: shellState.resolvedBleedOptions.cropMarks.style,
          },
    cutMarks:
      configForRun.bleedMode === "bakedInImage"
        ? shellState.resolvedBleedOptions.cutMarks
        : {
            enabled: false,
            color: shellState.resolvedBleedOptions.cutMarks.color,
          },
    roundedCorners: shellState.resolvedBleedOptions.roundedCorners,
    assetBlobsById: cache,
    heroBackLogoBlobsById: heroBackLogoCache,
  });
  cache.clear();
  heroBackLogoCache.clear();
  if (!blob) {
    return null;
  }

  return new Uint8Array(await blob.arrayBuffer());
}
