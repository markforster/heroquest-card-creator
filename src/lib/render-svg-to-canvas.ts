"use client";

import { getLocationOriginInfo } from "@/lib/browser";
import {
  extractFileName,
  getEmbeddedFontCss,
  guessOriginalFileName,
  readBlobAsDataUrl,
} from "@/lib/card-preview";
import { getSvgImageHref, insertSvgStyle, setSvgImageHref } from "@/lib/dom";
import { logAssetInlineById } from "@/lib/export-logging";
import type { RenderSvgToCanvasOptions } from "@/lib/render-svg-to-canvas.types";

export async function renderSvgToCanvas({
  svgElement,
  width,
  height,
  existingCanvas,
  removeDebugBounds = true,
  loggingId,
  assetBlobsById,
}: RenderSvgToCanvasOptions): Promise<HTMLCanvasElement | null> {
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  if (removeDebugBounds) {
    clonedSvg.querySelectorAll('[data-debug-bounds="true"]').forEach((node) => {
      node.remove();
    });
  }

  const { origin, isFileProtocol } = getLocationOriginInfo();
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
      const hrefAttr = getSvgImageHref(imgEl);
      if (!hrefAttr || hrefAttr.startsWith("data:")) return;

      const userAssetId = imgEl.getAttribute("data-user-asset-id");
      const assetName = imgEl.getAttribute("data-user-asset-name");
      const assetLabel = userAssetId ?? extractFileName(hrefAttr) ?? hrefAttr ?? "unknown";
      if (userAssetId) {
        const cachedBlob = assetBlobsById?.get(userAssetId);
        if (cachedBlob) {
          const cacheStart = now();
          try {
            const dataUrl = await readBlobAsDataUrl(cachedBlob);
            setSvgImageHref(imgEl, dataUrl);
            logAssetInlineById(loggingId, {
              assetId: userAssetId,
              assetName,
              source: "userAssetCache",
              durationMs: now() - cacheStart,
              outcome: "success",
            });
            return;
          } catch {
            logAssetInlineById(loggingId, {
              assetId: userAssetId,
              assetName,
              source: "userAssetCache",
              durationMs: now() - cacheStart,
              outcome: "fail",
            });
          }
        }

        const inlineStart = now();
        let didInline = false;
        try {
          const { getAssetBlob } = await import("@/lib/assets-db");
          const blob = await getAssetBlob(userAssetId);
          if (blob) {
            const dataUrl = await readBlobAsDataUrl(blob);
            setSvgImageHref(imgEl, dataUrl);
            didInline = true;
          }
        } catch {
          // Fall through to the normal handling.
        }
        logAssetInlineById(loggingId, {
          assetId: userAssetId,
          assetName,
          source: "userAssetId",
          durationMs: now() - inlineStart,
          outcome: didInline ? "success" : "fail",
        });
        if (didInline) {
          return;
        }
      }

      if (embeddedImagesByFileName) {
        const fileName = extractFileName(hrefAttr);
        if (fileName) {
          const candidates = guessOriginalFileName(fileName);
          for (const candidate of candidates) {
            const embedded = embeddedImagesByFileName[candidate];
            if (embedded) {
              const inlineStart = now();
              setSvgImageHref(imgEl, embedded);
              logAssetInlineById(loggingId, {
                assetId: assetLabel,
                assetName,
                source: "embedded",
                durationMs: now() - inlineStart,
                outcome: "success",
              });
              return;
            }
          }
        }
      }

      // When opened via file:// in Chrome/Edge, fetch() is blocked from origin "null" for file
      // resources. At this point we only attempt fetch for blob: URLs (user assets), or for
      // non-file protocols.
      if (isFileProtocol && !hrefAttr.startsWith("blob:")) {
        logAssetInlineById(loggingId, {
          assetId: assetLabel,
          assetName,
          source: "fetch",
          durationMs: 0,
          outcome: "skipped",
        });
        return;
      }

      let url = hrefAttr;
      if (hrefAttr.startsWith("/")) {
        url = origin + hrefAttr;
      }

      const fetchStart = now();
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const dataUrl = await readBlobAsDataUrl(blob, "Failed to read image blob");

        setSvgImageHref(imgEl, dataUrl);
        logAssetInlineById(loggingId, {
          assetId: assetLabel,
          assetName,
          source: "fetch",
          durationMs: now() - fetchStart,
          outcome: "success",
        });
      } catch {
        logAssetInlineById(loggingId, {
          assetId: assetLabel,
          assetName,
          source: "fetch",
          durationMs: now() - fetchStart,
          outcome: "fail",
        });
        if (hrefAttr.startsWith("/")) {
          const absolute = origin + hrefAttr;
          setSvgImageHref(imgEl, absolute);
        }
      }
    }),
  );

  const fontCss = await getEmbeddedFontCss();
  if (fontCss) {
    insertSvgStyle(clonedSvg, fontCss);
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

    const canvas = existingCanvas ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to get 2D context");
    }

    if (!imageBitmap) {
      const img = new Image();
      img.src = svgUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load SVG image"));
      });

      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    }

    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
