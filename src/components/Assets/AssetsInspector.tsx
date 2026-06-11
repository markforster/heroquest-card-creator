"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormState } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import { formatBytes, sortCardsByUpdated } from "@/components/Assets/asset-formatters";
import { getUsageBoundsForTemplate } from "@/components/Assets/asset-inspector-usage";
import type {
  ConvertPreviewState,
  FrameSize,
  OptimizePreviewState,
  PendingReplaceState,
} from "@/components/Assets/AssetsInspector.types";
import AssetsInspectorDetails from "@/components/Assets/AssetsInspectorDetails";
import AssetsInspectorHero from "@/components/Assets/AssetsInspectorHero";
import type { AssetUsage, AssetUsageBounds } from "@/components/Assets/AssetsRoutePanels.types";
import getImageDimensions from "@/components/Assets/getImageDimensions";
import {
  AssetsConvertModal,
  AssetsOptimizeModal,
  AssetsPreviewModal,
  AssetsReplaceModal,
} from "@/components/Assets/modals";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { optimizeImageBlob } from "@/lib/image-optimization";
import type { TemplateId } from "@/types/templates";

import type { ChangeEvent } from "react";

type AssetsInspectorProps = {
  assets: AssetRecord[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onReplaceComplete: () => void;
  onOptimizeComplete: () => void;
  refreshKey: number;
};

const INSPECT_ZOOM = 2;

export default function AssetsInspector({
  assets,
  currentIndex,
  onSelectIndex,
  onReplaceComplete,
  onOptimizeComplete,
  refreshKey,
}: AssetsInspectorProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { requestRecenter } = usePreviewRenderer();
  const {
    state: { selectedTemplateId },
  } = useCardEditor();
  const { isDirty } = useFormState();
  const { saveCurrentCard } = useEditorSave();
  const { enqueueAsset } = useAssetKindQueue();
  const safeIndex = Math.min(currentIndex, assets.length - 1);
  const asset = assets[safeIndex];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [assetBlob, setAssetBlob] = useState<Blob | null>(null);
  const [isOpaquePng, setIsOpaquePng] = useState(false);
  const [assetSizeBytes, setAssetSizeBytes] = useState<number | null>(null);
  const [usage, setUsage] = useState<AssetUsage>({ total: 0, cards: [] });
  const [usageBounds, setUsageBounds] = useState<AssetUsageBounds | null>(null);
  const [pendingOpenCard, setPendingOpenCard] = useState<CardRecord | null>(null);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingReplaceState | null>(null);
  const [optimizeScalePercent, setOptimizeScalePercent] = useState(100);
  const [optimizeQuality, setOptimizeQuality] = useState(0.85);
  const [optimizeSource, setOptimizeSource] = useState<Blob | null>(null);
  const [optimizePreview, setOptimizePreview] = useState<OptimizePreviewState | null>(null);
  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplyingOptimization, setIsApplyingOptimization] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const optimizeRunRef = useRef(0);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isApplyingConvert, setIsApplyingConvert] = useState(false);
  const [convertQuality, setConvertQuality] = useState(0.85);
  const [convertPreview, setConvertPreview] = useState<ConvertPreviewState | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertInspect, setConvertInspect] = useState(false);
  const [convertPan, setConvertPan] = useState({ x: 0, y: 0 });
  const [convertImageSize, setConvertImageSize] = useState<FrameSize>({
    width: 0,
    height: 0,
  });
  const convertFrameRef = useRef<HTMLDivElement | null>(null);
  const convertImgRef = useRef<HTMLImageElement | null>(null);
  const convertLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const convertInspectRef = useRef<HTMLDivElement | null>(null);
  const CONVERT_INSPECT_THRESHOLD_PX = 3;
  const [inspectPan, setInspectPan] = useState({ x: 0, y: 0 });
  const originalFrameRef = useRef<HTMLDivElement | null>(null);
  const optimizedFrameRef = useRef<HTMLDivElement | null>(null);
  const [originalFrameSize, setOriginalFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const [optimizedFrameSize, setOptimizedFrameSize] = useState<FrameSize>({
    width: 0,
    height: 0,
  });
  const [keepBackup, setKeepBackup] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const showCarousel = assets.length > 1;
  const canReplaceImage = assets.length === 1;
  const isJpegLike = asset.mimeType === "image/jpeg" || asset.mimeType === "image/jpg";
  const maxEdge = Math.max(asset.width, asset.height);
  const requiredWidth = usageBounds?.width ?? 0;
  const requiredHeight = usageBounds?.height ?? 0;
  const pixelationThresholdPercent =
    requiredWidth > 0 && requiredHeight > 0 && asset.width > 0 && asset.height > 0
      ? Math.min(
          100,
          Math.max(
            10,
            Math.ceil(Math.max(requiredWidth / asset.width, requiredHeight / asset.height) * 100),
          ),
        )
      : null;
  const minScaleByWidth =
    requiredWidth > 0 && asset.width > 0 ? Math.ceil((requiredWidth / asset.width) * 100) : 10;
  const minScaleByHeight =
    requiredHeight > 0 && asset.height > 0
      ? Math.ceil((requiredHeight / asset.height) * 100)
      : 10;
  const recommendedMinScalePercent =
    requiredWidth > 0 && requiredHeight > 0
      ? Math.min(100, Math.max(10, Math.max(minScaleByWidth, minScaleByHeight)))
      : 10;
  const canShowResizeWarning =
    requiredWidth > 0 &&
    requiredHeight > 0 &&
    optimizeScalePercent < recommendedMinScalePercent;
  const recenterTimeoutRef = useRef<number | null>(null);

  const openCard = async (cardId: string) => {
    navigate(`/cards/${cardId}`);
    if (ENABLE_WEBGL_RECENTER_ON_FACE_SELECT) {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
      recenterTimeoutRef.current = window.setTimeout(() => {
        requestRecenter();
      }, 90);
    }
  };

  const requestOpenCard = async (cardId: string) => {
    if (selectedTemplateId && isDirty) {
      const record = await apiClient.getCard({ params: { id: cardId } });
      if (!record) return;
      setPendingOpenCard(record);
      setIsSavePromptOpen(true);
      return;
    }
    await openCard(cardId);
  };

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreviewUrl(null);
    setIsPreviewLoading(true);

    (async () => {
      try {
        url = await apiClient.getAssetObjectUrl({ params: { id: asset.id } });
      } catch {
        url = null;
      }
      if (!cancelled) {
        setPreviewUrl(url);
        setIsPreviewLoading(false);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    })();

    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [asset.id, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setAssetSizeBytes(null);
    setAssetBlob(null);
    setIsOpaquePng(false);
    (async () => {
      try {
        const blob = await apiClient.getAssetBlob({ params: { id: asset.id } });
        if (cancelled) return;
        setAssetSizeBytes(blob?.size ?? null);
        setAssetBlob(blob ?? null);
      } catch {
        if (!cancelled) {
          setAssetSizeBytes(null);
          setAssetBlob(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset.id, refreshKey]);

  useEffect(() => {
    if (!assetBlob || asset.mimeType !== "image/png") {
      setIsOpaquePng(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(assetBlob);
          const canvas =
            typeof OffscreenCanvas === "function"
              ? new OffscreenCanvas(bitmap.width, bitmap.height)
              : document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (!ctx || !("drawImage" in ctx) || !("getImageData" in ctx)) {
            bitmap.close?.();
            return;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close?.();
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let opaque = true;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] !== 255) {
              opaque = false;
              break;
            }
          }
          if (!cancelled) setIsOpaquePng(opaque);
          return;
        }

        const url = URL.createObjectURL(assetBlob);
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load PNG"));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let opaque = true;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] !== 255) {
              opaque = false;
              break;
            }
          }
          if (!cancelled) setIsOpaquePng(opaque);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (!cancelled) setIsOpaquePng(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetBlob, asset.mimeType]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cards = await apiClient.listCards({ queries: { status: "saved" } });
        if (cancelled) return;
        const usedCards = new Map<string, CardRecord>();
        let maxWidth = 0;
        let maxHeight = 0;
        cards.forEach((card) => {
          let used = false;
          if (card.imageAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(card.templateId as TemplateId, "image");
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (card.monsterIconAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(card.templateId as TemplateId, "icon");
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (used) {
            usedCards.set(card.id, card);
          }
        });
        const matchedCards = sortCardsByUpdated(Array.from(usedCards.values()));
        setUsage({ total: matchedCards.length, cards: matchedCards });
        setUsageBounds(
          maxWidth > 0 && maxHeight > 0 ? { width: maxWidth, height: maxHeight } : null,
        );
      } catch {
        if (!cancelled) {
          setUsage({ total: 0, cards: [] });
          setUsageBounds(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  useEffect(() => {
    setPendingOpenCard(null);
    setIsSavePromptOpen(false);
  }, [asset.id]);

  useEffect(() => {
    return () => {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
    };
  }, []);

  const pendingMismatch = pendingReplace
    ? pendingReplace.width !== asset.width || pendingReplace.height !== asset.height
    : false;

  useEffect(() => {
    return () => {
      if (pendingReplace?.previewUrl) {
        URL.revokeObjectURL(pendingReplace.previewUrl);
      }
    };
  }, [pendingReplace]);

  useEffect(() => {
    setPendingReplace(null);
    setKeepBackup(false);
    setIsPreviewModalOpen(false);
    setIsOptimizeOpen(false);
    setIsConvertOpen(false);
    setConvertPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setIsConverting(false);
    setIsApplyingConvert(false);
    setConvertQuality(0.85);
    setOptimizeSource(null);
    setOptimizePreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setOptimizeError(null);
    setIsOptimizing(false);
    setIsApplyingOptimization(false);
    setOptimizeScalePercent(100);
    setOptimizeQuality(0.85);
    setInspectPan({ x: 0, y: 0 });
  }, [asset.id]);

  useLayoutEffect(() => {
    const updateSizes = () => {
      const original = originalFrameRef.current;
      const optimized = optimizedFrameRef.current;
      if (original) {
        const rect = original.getBoundingClientRect();
        setOriginalFrameSize({ width: rect.width, height: rect.height });
      }
      if (optimized) {
        const rect = optimized.getBoundingClientRect();
        setOptimizedFrameSize({ width: rect.width, height: rect.height });
      }
    };
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  const handleInspectMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const original = originalFrameRef.current;
    const optimized = optimizedFrameRef.current;
    if (original) {
      const originalRect = original.getBoundingClientRect();
      setOriginalFrameSize((prev) =>
        prev.width === originalRect.width && prev.height === originalRect.height
          ? prev
          : { width: originalRect.width, height: originalRect.height },
      );
    }
    if (optimized) {
      const optimizedRect = optimized.getBoundingClientRect();
      setOptimizedFrameSize((prev) =>
        prev.width === optimizedRect.width && prev.height === optimizedRect.height
          ? prev
          : { width: optimizedRect.width, height: optimizedRect.height },
      );
    }
    const normX = (event.clientX - rect.left) / rect.width;
    const normY = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(1, Math.max(0, normX));
    const clampedY = Math.min(1, Math.max(0, normY));
    setInspectPan({
      x: (0.5 - clampedX) * 2,
      y: (0.5 - clampedY) * 2,
    });
  };

  const handleInspectLeave = () => {
    setInspectPan({ x: 0, y: 0 });
  };

  const buildInspectStyle = (
    frame: FrameSize,
    image: { width: number; height: number } | null,
  ): React.CSSProperties => {
    if (!frame.width || !frame.height || !image) return { transform: `scale(${INSPECT_ZOOM})` };
    const scale = Math.min(frame.width / image.width, frame.height / image.height);
    const baseWidth = image.width * scale;
    const baseHeight = image.height * scale;
    const scaledWidth = baseWidth * INSPECT_ZOOM;
    const scaledHeight = baseHeight * INSPECT_ZOOM;
    const maxPanX = Math.max(0, (scaledWidth - frame.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - frame.height) / 2);
    const translateX = inspectPan.x * maxPanX;
    const translateY = inspectPan.y * maxPanY;
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${INSPECT_ZOOM})`,
    };
  };

  useEffect(() => {
    if (optimizeScalePercent < 10) {
      setOptimizeScalePercent(10);
    }
    if (optimizeScalePercent > 100) {
      setOptimizeScalePercent(100);
    }
  }, [optimizeScalePercent]);

  const handleReplaceConfirm = async () => {
    if (!pendingReplace) return;
    setIsReplacing(true);
    try {
      if (keepBackup) {
        const existingBlob = await apiClient.getAssetBlob({ params: { id: asset.id } });
        if (existingBlob) {
          const allAssets = await apiClient.listAssets();
          const existingNames = new Set(allAssets.map((item) => item.name));
          const dateStamp = new Date().toISOString().slice(0, 10);
          const backupBase = `${asset.name} (backup ${dateStamp})`;
          const backupName = getNextAvailableFilename(existingNames, backupBase);
          await apiClient.addAsset({
            id: generateId(),
            blob: existingBlob,
            name: backupName,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
          });
        } else {
          window.alert(t("alert.replaceBackupFailed"));
        }
      }

      await apiClient.replaceAsset(
        {
          blob: pendingReplace.file,
          name: asset.name,
          mimeType: pendingReplace.mimeType,
          width: pendingReplace.width,
          height: pendingReplace.height,
          createdAt: asset.createdAt,
        },
        { params: { id: asset.id } },
      );
      await apiClient.updateAssetMetadata(
        {
          patch: {
            assetKindStatus: "unclassified",
            assetKind: undefined,
            assetKindSource: undefined,
            assetKindConfidence: undefined,
            assetKindUpdatedAt: Date.now(),
          },
        },
        { params: { id: asset.id } },
      );
      enqueueAsset(asset.id, { width: pendingReplace.width, height: pendingReplace.height });
      setAssetSizeBytes(pendingReplace.file.size);
      setAssetBlob(pendingReplace.file);
      onReplaceComplete();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[assets] Failed to replace asset", error);
      window.alert(t("alert.replaceFailed"));
    } finally {
      setIsReplacing(false);
      setPendingReplace(null);
      setKeepBackup(false);
    }
  };

  const closeReplaceModal = () => {
    if (isReplacing) return;
    setPendingReplace(null);
    setKeepBackup(false);
  };

  useEscapeModalAware({
    id: "assets:replace-modal",
    isOpen: Boolean(pendingReplace),
    onEscape: closeReplaceModal,
  });

  const handleConvertOpen = () => {
    setIsConvertOpen(true);
    setConvertError(null);
    setConvertInspect(false);
    setConvertPan({ x: 0, y: 0 });
    convertLastPointRef.current = null;
    setConvertPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  useEffect(() => {
    if (!isConvertOpen || !assetBlob) return;
    let cancelled = false;
    const run = async () => {
      setIsConverting(true);
      setConvertError(null);
      try {
        let bitmap: ImageBitmap | null = null;
        if (typeof createImageBitmap === "function") {
          try {
            bitmap = await createImageBitmap(assetBlob);
          } catch {
            bitmap = null;
          }
        }
        const width = bitmap ? bitmap.width : asset.width;
        const height = bitmap ? bitmap.height : asset.height;
        const canUseOffscreen =
          typeof OffscreenCanvas === "function" &&
          typeof OffscreenCanvas.prototype.convertToBlob === "function";
        const canvas = canUseOffscreen
          ? new OffscreenCanvas(width, height)
          : document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx || !("drawImage" in ctx)) {
          bitmap?.close?.();
          return;
        }
        if (bitmap) {
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close?.();
        } else {
          const url = URL.createObjectURL(assetBlob);
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("Failed to load PNG"));
              img.src = url;
            });
            ctx.drawImage(img, 0, 0);
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        let jpegBlob: Blob;
        if (canvas instanceof OffscreenCanvas) {
          jpegBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: convertQuality });
        } else {
          jpegBlob = await new Promise<Blob>((resolve, reject) => {
            const target = canvas as HTMLCanvasElement;
            target.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Failed to encode JPEG"));
                  return;
                }
                resolve(blob);
              },
              "image/jpeg",
              convertQuality,
            );
          });
        }
        if (cancelled) return;
        const url = URL.createObjectURL(jpegBlob);
        setConvertPreview((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return { blob: jpegBlob, url, bytes: jpegBlob.size };
        });
      } catch {
        if (!cancelled) {
          setConvertPreview(null);
          setConvertError(t("status.convertPreviewFailed"));
        }
      } finally {
        if (!cancelled) setIsConverting(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [assetBlob, asset.height, asset.width, convertQuality, isConvertOpen, t]);

  useEffect(() => {
    setConvertInspect(false);
    setConvertPan({ x: 0, y: 0 });
    convertLastPointRef.current = null;
  }, [convertPreview]);

  const handleConvertApply = async () => {
    if (!convertPreview) return;
    setIsApplyingConvert(true);
    try {
      await apiClient.replaceAsset(
        {
          blob: convertPreview.blob,
          name: asset.name,
          mimeType: "image/jpeg",
          width: asset.width,
          height: asset.height,
          createdAt: asset.createdAt,
          assetKind: asset.assetKind,
          assetKindStatus: asset.assetKindStatus,
          assetKindSource: asset.assetKindSource,
          assetKindConfidence: asset.assetKindConfidence,
          assetKindUpdatedAt: asset.assetKindUpdatedAt,
        },
        { params: { id: asset.id } },
      );
      setAssetSizeBytes(convertPreview.bytes);
      setAssetBlob(convertPreview.blob);
      onReplaceComplete();
      setIsConvertOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[assets] Failed to convert asset", error);
      window.alert(t("alert.replaceFailed"));
    } finally {
      setIsApplyingConvert(false);
    }
  };

  const closeConvertModal = () => {
    if (isApplyingConvert) return;
    if (convertPreview?.url) {
      URL.revokeObjectURL(convertPreview.url);
    }
    setConvertPreview(null);
    setConvertError(null);
    setConvertInspect(false);
    setConvertPan({ x: 0, y: 0 });
    convertLastPointRef.current = null;
    setIsConvertOpen(false);
  };

  useEscapeModalAware({
    id: "assets:convert-modal",
    isOpen: isConvertOpen,
    onEscape: closeConvertModal,
  });

  const handleOptimizeOpen = async () => {
    setIsOptimizeOpen(true);
    setOptimizeError(null);
    setOptimizePreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setOptimizeSource(null);
    try {
      const blob = await apiClient.getAssetBlob({ params: { id: asset.id } });
      if (!blob) {
        setOptimizeError(t("alert.optimizeMissingSource"));
        return;
      }
      setOptimizeSource(blob);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[assets] Failed to load asset blob for optimization", error);
      setOptimizeError(t("alert.optimizeFailed"));
    }
  };

  useEffect(() => {
    if (!isOptimizeOpen || !optimizeSource) return;
    const runId = optimizeRunRef.current + 1;
    optimizeRunRef.current = runId;
    const timeoutId = window.setTimeout(async () => {
      setIsOptimizing(true);
      setOptimizeError(null);
      try {
        const scalePercent = Math.min(100, Math.max(10, optimizeScalePercent));
        const targetMax = Math.round((maxEdge * scalePercent) / 100);
        const result = await optimizeImageBlob(optimizeSource, {
          maxDimension: targetMax,
          jpegQuality: optimizeQuality,
        });
        if (optimizeRunRef.current !== runId) return;
        const url = URL.createObjectURL(result.blob);
        setOptimizePreview((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return {
            blob: result.blob,
            url,
            width: result.width,
            height: result.height,
            bytes: result.optimizedBytes,
          };
        });
      } catch (error) {
        if (optimizeRunRef.current !== runId) return;
        // eslint-disable-next-line no-console
        console.error("[assets] Optimization failed", error);
        setOptimizeError(t("alert.optimizeFailed"));
      } finally {
        if (optimizeRunRef.current === runId) {
          setIsOptimizing(false);
        }
      }
    }, 200);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    asset.height,
    asset.width,
    isOptimizeOpen,
    maxEdge,
    optimizeQuality,
    optimizeScalePercent,
    optimizeSource,
    t,
  ]);

  useEffect(() => {
    if (!isOptimizeOpen) return;
    return () => {
      setOptimizePreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
    };
  }, [isOptimizeOpen]);

  const handleOptimizeApply = async () => {
    if (!optimizePreview) return;
    setIsApplyingOptimization(true);
    try {
      await apiClient.replaceAsset(
        {
          blob: optimizePreview.blob,
          name: asset.name,
          mimeType: asset.mimeType,
          width: optimizePreview.width,
          height: optimizePreview.height,
          createdAt: asset.createdAt,
          assetKind: asset.assetKind,
          assetKindStatus: asset.assetKindStatus,
          assetKindSource: asset.assetKindSource,
          assetKindConfidence: asset.assetKindConfidence,
          assetKindUpdatedAt: asset.assetKindUpdatedAt,
        },
        { params: { id: asset.id } },
      );
      onOptimizeComplete();
      setIsOptimizeOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[assets] Failed to apply optimization", error);
      window.alert(t("alert.optimizeApplyFailed"));
    } finally {
      setIsApplyingOptimization(false);
    }
  };

  const optimizeDelta =
    optimizeSource && optimizePreview ? optimizePreview.bytes - optimizeSource.size : null;
  const hasSizeReduction = typeof optimizeDelta === "number" && optimizeDelta < 0;
  const hasSizeIncrease = typeof optimizeDelta === "number" && optimizeDelta > 0;
  const hasDimensionReduction = Boolean(
    optimizePreview &&
      (optimizePreview.width < asset.width || optimizePreview.height < asset.height),
  );
  const canApplyOptimization =
    Boolean(optimizePreview) && Boolean(hasSizeReduction || hasDimensionReduction);
  const pixelationScale =
    optimizePreview && requiredWidth > 0 && requiredHeight > 0
      ? Math.max(
          requiredWidth / Math.max(1, optimizePreview.width),
          requiredHeight / Math.max(1, optimizePreview.height),
        )
      : null;
  const hasPixelationRisk = typeof pixelationScale === "number" && pixelationScale > 1.01;
  const optimizeReasons: string[] = [];
  if (usageBounds) {
    optimizeReasons.push(
      t("helper.optimizeUsageMinimum")
        .replace("{width}", String(Math.round(usageBounds.width)))
        .replace("{height}", String(Math.round(usageBounds.height))),
    );
  }
  if (hasPixelationRisk && usageBounds) {
    optimizeReasons.push(
      t("helper.optimizePixelationRisk")
        .replace("{scale}", String(Math.round(pixelationScale * 100)))
        .replace("{width}", String(Math.round(requiredWidth)))
        .replace("{height}", String(Math.round(requiredHeight))),
    );
  }
  if (canShowResizeWarning) {
    optimizeReasons.push(
      t("helper.optimizeBelowMinimum")
        .replace("{width}", String(Math.round(requiredWidth)))
        .replace("{height}", String(Math.round(requiredHeight))),
    );
  }
  if (!canApplyOptimization && optimizePreview) {
    optimizeReasons.push(t("helper.optimizeNoBenefit"));
  }
  const optimizeStatus =
    !canApplyOptimization && optimizePreview
      ? t("status.optimizeNoBenefit")
      : hasPixelationRisk
        ? t("status.optimizePixelationRisk")
        : optimizePreview
          ? t("status.optimizeReady")
          : null;

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > 1) {
      window.alert(t("alert.replaceSingleImageOnly"));
      return;
    }
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      window.alert(t("alert.replaceUnsupportedFile"));
      return;
    }

    try {
      if (pendingReplace?.previewUrl) {
        URL.revokeObjectURL(pendingReplace.previewUrl);
      }
      const { width, height } = await getImageDimensions(file);
      setPendingReplace({
        file,
        width,
        height,
        mimeType: file.type,
        sizeBytes: file.size,
        previewUrl: URL.createObjectURL(file),
      });
      setKeepBackup(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[assets] Failed to read replacement image", error);
      window.alert(t("alert.replaceFailed"));
    }
  };

  useEffect(() => {
    if (!showCarousel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSelectIndex((safeIndex - 1 + assets.length) % assets.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelectIndex((safeIndex + 1) % assets.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assets.length, onSelectIndex, safeIndex, showCarousel]);

  return (
    <aside className={`${styles.rightPanel} ${styles.assetsRightPanel}`}>
      <div className={styles.assetsInspectorBody}>
        <div className={styles.assetsInspectorActions}>
          {isOpaquePng ? (
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={handleConvertOpen}
            >
              {t("actions.convertToJpeg")}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => {
              if (!canReplaceImage) return;
              fileInputRef.current?.click();
            }}
            disabled={!canReplaceImage}
          >
            {t("actions.replaceImage")}
          </button>
          {false ? (
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={() => void handleOptimizeOpen()}
              disabled={!isJpegLike}
            >
              {t("actions.optimizeImage")}
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleReplaceFile}
          />
        </div>
        <AssetsInspectorHero
          assetsCount={assets.length}
          safeIndex={safeIndex}
          assetName={asset.name}
          previewUrl={previewUrl}
          isPreviewLoading={isPreviewLoading}
          showCarousel={showCarousel}
          onPrevious={() => onSelectIndex((safeIndex - 1 + assets.length) % assets.length)}
          onNext={() => onSelectIndex((safeIndex + 1) % assets.length)}
          onOpenPreview={() => setIsPreviewModalOpen(true)}
        />
        <AssetsInspectorDetails
          asset={asset}
          assetSizeBytes={assetSizeBytes}
          usage={usage}
          onOpenCard={(cardId) => void requestOpenCard(cardId)}
        />
      </div>
      <ConfirmModal
        isOpen={isSavePromptOpen}
        title={t("heading.saveBeforeView")}
        confirmLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          setIsSavePromptOpen(false);
          const nextOpenCard = pendingOpenCard;
          setPendingOpenCard(null);
          const saved = await saveCurrentCard();
          if (!saved) return;
          if (nextOpenCard) {
            await openCard(nextOpenCard.id);
          }
        }}
        onCancel={() => {
          setIsSavePromptOpen(false);
          setPendingOpenCard(null);
        }}
      >
        {t("confirm.saveBeforeViewBody")}
      </ConfirmModal>
      <AssetsPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewUrl={previewUrl}
        isLoading={isPreviewLoading}
        assetName={asset.name}
      />
      <AssetsReplaceModal
        isOpen={Boolean(pendingReplace)}
        onClose={closeReplaceModal}
        onConfirm={handleReplaceConfirm}
        isReplacing={isReplacing}
        previewUrl={previewUrl}
        assetName={asset.name}
        pendingReplace={pendingReplace}
        pendingMismatch={pendingMismatch}
        originalResolution={`${asset.width}×${asset.height}`}
        replacementResolution={
          pendingReplace ? `${pendingReplace.width}×${pendingReplace.height}` : "—"
        }
        originalSize={assetSizeBytes != null ? formatBytes(assetSizeBytes) : "—"}
        replacementSize={pendingReplace ? formatBytes(pendingReplace.sizeBytes) : "—"}
        fileType={asset.mimeType}
        replacementType={pendingReplace?.mimeType ?? "—"}
        keepBackup={keepBackup}
        onKeepBackupChange={setKeepBackup}
      />
      <AssetsOptimizeModal
        isOpen={isOptimizeOpen}
        onClose={() => {
          if (isApplyingOptimization) return;
          setIsOptimizeOpen(false);
        }}
        onApply={() => void handleOptimizeApply()}
        isApplyingOptimization={isApplyingOptimization}
        isOptimizing={isOptimizing}
        optimizePreview={optimizePreview}
        canApplyOptimization={canApplyOptimization}
        optimizeStatus={optimizeStatus}
        optimizeReasons={optimizeReasons}
        previewUrl={previewUrl}
        assetName={asset.name}
        originalFrameRef={originalFrameRef}
        optimizedFrameRef={optimizedFrameRef}
        onInspectMove={handleInspectMove}
        onInspectLeave={handleInspectLeave}
        buildInspectStyle={buildInspectStyle}
        originalFrameSize={originalFrameSize}
        optimizedFrameSize={optimizedFrameSize}
        assetWidth={asset.width}
        assetHeight={asset.height}
        optimizeScalePercent={optimizeScalePercent}
        onOptimizeScaleChange={(nextValue) => {
          if (!Number.isFinite(nextValue)) return;
          setOptimizeScalePercent(Math.min(100, Math.max(10, nextValue)));
        }}
        pixelationThresholdPercent={pixelationThresholdPercent}
        isJpegLike={isJpegLike}
        optimizeQuality={optimizeQuality}
        onOptimizeQualityChange={(nextValue) => {
          if (!Number.isFinite(nextValue)) return;
          const clamped = Math.min(100, Math.max(10, nextValue));
          setOptimizeQuality(clamped / 100);
        }}
        originalSize={optimizeSource ? formatBytes(optimizeSource.size) : "—"}
        optimizedSize={optimizePreview ? formatBytes(optimizePreview.bytes) : "—"}
        sizeChangeValue={
          optimizeSource && optimizePreview
            ? (() => {
                if (optimizeSource.size === 0) return "—";
                const diff = optimizePreview.bytes - optimizeSource.size;
                if (diff === 0) return t("label.sizeUnchanged");
                const percent = Math.abs(diff) / optimizeSource.size;
                const percentLabel = `${Math.round(percent * 100)}%`;
                return diff < 0
                  ? `${t("label.sizeReduction")} ${percentLabel}`
                  : `${t("label.sizeIncrease")} ${percentLabel}`;
              })()
            : "—"
        }
        sizeChangeClassName={
          optimizeSource && optimizePreview
            ? hasSizeReduction
              ? styles.assetsOptimizeDeltaGood
              : hasSizeIncrease
                ? styles.assetsOptimizeDeltaBad
                : undefined
            : undefined
        }
        optimizeError={optimizeError}
      />
      <AssetsConvertModal
        isOpen={isConvertOpen}
        onClose={closeConvertModal}
        onApply={handleConvertApply}
        isApplyingConvert={isApplyingConvert}
        isConverting={isConverting}
        convertPreview={convertPreview}
        assetName={asset.name}
        convertError={convertError}
        convertFrameRef={convertFrameRef}
        convertImgRef={convertImgRef}
        convertInspectRef={convertInspectRef}
        onMouseEnter={(event) => {
          convertLastPointRef.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseMove={(event) => {
          if (!convertPreview || !convertFrameRef.current || !convertImgRef.current) {
            return;
          }
          if (!convertInspectRef.current) return;
          const rect = convertInspectRef.current.getBoundingClientRect();
          const width = convertImageSize.width || convertImgRef.current.naturalWidth;
          const height = convertImageSize.height || convertImgRef.current.naturalHeight;
          if (!width || !height) return;
          const viewportWidth = rect.width;
          const viewportHeight = rect.height;
          if (width <= viewportWidth && height <= viewportHeight) {
            setConvertInspect(false);
            setConvertPan({ x: 0, y: 0 });
            return;
          }
          const last = convertLastPointRef.current;
          const nextPoint = { x: event.clientX, y: event.clientY };
          convertLastPointRef.current = nextPoint;
          if (!convertInspect) {
            if (!last) return;
            const delta = Math.abs(nextPoint.x - last.x) + Math.abs(nextPoint.y - last.y);
            if (delta < CONVERT_INSPECT_THRESHOLD_PX) return;
            setConvertInspect(true);
          }
          const contentX = event.clientX - rect.left;
          const contentY = event.clientY - rect.top;
          const fx = Math.min(1, Math.max(0, contentX / viewportWidth));
          const fy = Math.min(1, Math.max(0, contentY / viewportHeight));
          const maxX = width - viewportWidth;
          const maxY = height - viewportHeight;
          setConvertPan({
            x: -fx * maxX,
            y: -fy * maxY,
          });
        }}
        onMouseLeave={() => {
          setConvertInspect(false);
          setConvertPan({ x: 0, y: 0 });
          convertLastPointRef.current = null;
        }}
        containerStyle={
          convertPreview
            ? ({
                ["--asset-preview-url" as const]: `url("${convertPreview.url}")`,
              } as React.CSSProperties)
            : undefined
        }
        onPreviewImageLoad={(width, height) => {
          if (!width || !height) return;
          setConvertImageSize({ width, height });
        }}
        convertInspect={convertInspect}
        convertImageWidth={convertImageSize.width}
        convertImageHeight={convertImageSize.height}
        convertPanX={convertPan.x}
        convertPanY={convertPan.y}
        originalSize={assetSizeBytes != null ? formatBytes(assetSizeBytes) : "—"}
        convertedSize={convertPreview ? formatBytes(convertPreview.bytes) : "—"}
        sizeChangeValue={
          assetSizeBytes != null && convertPreview
            ? (() => {
                if (assetSizeBytes === 0) return "—";
                const diff = assetSizeBytes - convertPreview.bytes;
                return `${Math.round((diff / assetSizeBytes) * 100)}%`;
              })()
            : "—"
        }
        convertQuality={convertQuality}
        onConvertQualityChange={(nextValue) => {
          if (!Number.isFinite(nextValue)) return;
          const clamped = Math.min(100, Math.max(10, nextValue));
          setConvertQuality(clamped / 100);
        }}
      />
    </aside>
  );
}
