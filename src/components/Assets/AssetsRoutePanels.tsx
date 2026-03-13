"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import AssetsMainPanel from "@/components/Assets/AssetsMainPanel";
import getImageDimensions from "@/components/Assets/getImageDimensions";
import ModalShell from "@/components/common/ModalShell";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import type { AssetRecord } from "@/api/assets";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { optimizeImageBlob } from "@/lib/image-optimization";
import type { Blueprint, BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

import type { ChangeEvent } from "react";

type AssetUsage = {
  total: number;
};

type AssetUsageBounds = {
  width: number;
  height: number;
};

const ASSET_PREVIEW_TILT_MAX_DEG = 8;

function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const precision = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[index]}`;
}

const INSPECT_ZOOM = 2;

type FrameSize = {
  width: number;
  height: number;
};

function getImageLayerBounds(blueprint: Blueprint | undefined): BlueprintBounds | null {
  if (!blueprint) return null;
  const candidates = blueprint.layers.filter(
    (layer) =>
      layer.type === "image" && layer.bind?.imageKey === "imageAssetId",
  );
  if (candidates.length === 0) return null;
  const layerBounds = candidates.find((layer) => layer.bounds)?.bounds ?? null;
  if (layerBounds) return layerBounds;
  return {
    x: 0,
    y: 0,
    width: blueprint.canvas.width,
    height: blueprint.canvas.height,
  };
}

function getIconLayerBounds(blueprint: Blueprint | undefined): BlueprintBounds | null {
  if (!blueprint?.groups) return null;
  for (const group of blueprint.groups) {
    for (const child of group.children ?? []) {
      if (child.type !== "icon") continue;
      if (child.bind?.iconKey !== "iconAssetId") continue;
      const size = typeof child.props?.size === "number" ? child.props.size : 140;
      return { x: 0, y: 0, width: size, height: size };
    }
  }
  return null;
}

function getUsageBoundsForTemplate(
  templateId: TemplateId,
  usageType: "image" | "icon",
): AssetUsageBounds | null {
  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) return null;
  const bounds =
    usageType === "image"
      ? getImageLayerBounds(blueprint)
      : getIconLayerBounds(blueprint);
  if (!bounds) return null;
  return { width: bounds.width, height: bounds.height };
}

function AssetsInspector({
  assets,
  currentIndex,
  onSelectIndex,
  onReplaceComplete,
  onOptimizeComplete,
  refreshKey,
}: {
  assets: AssetRecord[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onReplaceComplete: () => void;
  onOptimizeComplete: () => void;
  refreshKey: number;
}) {
  const { t } = useI18n();
  const { enqueueAsset, cancelAsset } = useAssetKindQueue();
  const safeIndex = Math.min(currentIndex, assets.length - 1);
  const asset = assets[safeIndex];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usage, setUsage] = useState<AssetUsage>({ total: 0 });
  const [usageBounds, setUsageBounds] = useState<AssetUsageBounds | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{
    file: File;
    width: number;
    height: number;
    mimeType: string;
  } | null>(null);
  const [optimizeScalePercent, setOptimizeScalePercent] = useState(100);
  const [optimizeQuality, setOptimizeQuality] = useState(0.85);
  const [optimizeSource, setOptimizeSource] = useState<Blob | null>(null);
  const [optimizePreview, setOptimizePreview] = useState<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
    bytes: number;
  } | null>(null);
  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplyingOptimization, setIsApplyingOptimization] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const optimizeRunRef = useRef(0);
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewInnerRef = useRef<HTMLDivElement | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const tiltPointRef = useRef<{ x: number; y: number } | null>(null);
  const idleFrameRef = useRef<number | null>(null);
  const idleTargetRef = useRef<{ x: number; y: number } | null>(null);
  const idleFromRef = useRef<{ x: number; y: number } | null>(null);
  const idleStartRef = useRef<number | null>(null);
  const idleDurationRef = useRef<number>(0);
  const isHoveringRef = useRef(false);
  const currentTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reduceMotionRef = useRef(false);
  const showCarousel = assets.length > 1;
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
            Math.ceil(
              Math.max(requiredWidth / asset.width, requiredHeight / asset.height) * 100,
            ),
          ),
        )
      : null;
  const minScaleByWidth =
    requiredWidth > 0 && asset.width > 0
      ? Math.ceil((requiredWidth / asset.width) * 100)
      : 10;
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
  const [isKindPopoverOpen, setIsKindPopoverOpen] = useState(false);
  const kindAnchorRef = useRef<HTMLButtonElement | null>(null);
  const kindPopoverRef = useRef<HTMLDivElement | null>(null);
  const [kindPopoverStyle, setKindPopoverStyle] = useState<React.CSSProperties | null>(null);
  const kindPopoverPlacement = usePopoverPlacement({
    isOpen: isKindPopoverOpen,
    anchorRef: kindAnchorRef,
    popoverRef: kindPopoverRef,
    offset: 8,
  });
  useOutsideClick(
    [kindPopoverRef, kindAnchorRef],
    () => setIsKindPopoverOpen(false),
    isKindPopoverOpen,
  );

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    (async () => {
      try {
        url = await apiClient.getAssetObjectUrl({ params: { id: asset.id } });
      } catch {
        url = null;
      }
      if (!cancelled) {
        setPreviewUrl(url);
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

    (async () => {
      try {
        const cards = await apiClient.listCards();
        if (cancelled) return;
        let total = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        cards.forEach((card) => {
          let used = false;
          if (card.imageAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(
              card.templateId as TemplateId,
              "image",
            );
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (card.monsterIconAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(
              card.templateId as TemplateId,
              "icon",
            );
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (used) total += 1;
        });
        setUsage({ total });
        setUsageBounds(
          maxWidth > 0 && maxHeight > 0 ? { width: maxWidth, height: maxHeight } : null,
        );
      } catch {
        if (!cancelled) {
          setUsage({ total: 0 });
          setUsageBounds(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  const dimensionsLabel = useMemo(() => {
    return `${asset.width}×${asset.height}`;
  }, [asset.height, asset.width]);

  const pendingMismatch = pendingReplace
    ? pendingReplace.width !== asset.width || pendingReplace.height !== asset.height
    : false;

  useEffect(() => {
    setPendingReplace(null);
    setKeepBackup(false);
    setIsKindPopoverOpen(false);
    setIsOptimizeOpen(false);
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

  const resetPreviewTilt = () => {
    const previewEl = previewInnerRef.current;
    if (!previewEl) return;
    previewEl.style.setProperty("--asset-preview-tilt-x", "0deg");
    previewEl.style.setProperty("--asset-preview-tilt-y", "0deg");
    currentTiltRef.current = { x: 0, y: 0 };
  };

  const stopIdleTilt = () => {
    if (idleFrameRef.current !== null) {
      cancelAnimationFrame(idleFrameRef.current);
      idleFrameRef.current = null;
    }
    idleTargetRef.current = null;
    idleFromRef.current = null;
    idleStartRef.current = null;
  };

  const startIdleTilt = () => {
    if (reduceMotionRef.current || isHoveringRef.current) return;
    if (idleFrameRef.current !== null) return;
    idleFrameRef.current = requestAnimationFrame(stepIdleTilt);
  };

  const stepIdleTilt = (timestamp: number) => {
    idleFrameRef.current = null;
    if (reduceMotionRef.current || isHoveringRef.current) {
      stopIdleTilt();
      return;
    }
    const previewEl = previewInnerRef.current;
    if (!previewEl) return;

    if (!idleTargetRef.current || idleStartRef.current === null) {
      const maxTilt = 1.8;
      const randTilt = () => (Math.random() * 2 - 1) * maxTilt;
      idleFromRef.current = { ...currentTiltRef.current };
      idleTargetRef.current = { x: randTilt(), y: randTilt() };
      idleStartRef.current = timestamp;
      idleDurationRef.current = 2800 + Math.random() * 2200;
    }

    const start = idleStartRef.current ?? timestamp;
    const duration = idleDurationRef.current || 3000;
    const progress = Math.min(1, (timestamp - start) / duration);
    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const target = idleTargetRef.current ?? { x: 0, y: 0 };
    const from = idleFromRef.current ?? { x: 0, y: 0 };
    const nextX = from.x + (target.x - from.x) * ease;
    const nextY = from.y + (target.y - from.y) * ease;

    previewEl.style.setProperty("--asset-preview-tilt-x", `${nextX.toFixed(2)}deg`);
    previewEl.style.setProperty("--asset-preview-tilt-y", `${nextY.toFixed(2)}deg`);
    currentTiltRef.current = { x: nextX, y: nextY };

    if (progress >= 1) {
      idleTargetRef.current = null;
      idleFromRef.current = null;
      idleStartRef.current = null;
    }

    idleFrameRef.current = requestAnimationFrame(stepIdleTilt);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      reduceMotionRef.current = media.matches;
      if (media.matches) {
        stopIdleTilt();
        resetPreviewTilt();
      }
    };
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (tiltFrameRef.current !== null) {
        cancelAnimationFrame(tiltFrameRef.current);
        tiltFrameRef.current = null;
      }
      stopIdleTilt();
    };
  }, []);

  const handlePreviewMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current) return;
    if (!isHoveringRef.current) {
      isHoveringRef.current = true;
      stopIdleTilt();
    }
    tiltPointRef.current = { x: event.clientX, y: event.clientY };
    if (tiltFrameRef.current !== null) return;
    tiltFrameRef.current = requestAnimationFrame(() => {
      tiltFrameRef.current = null;
      const previewEl = previewInnerRef.current;
      const point = tiltPointRef.current;
      if (!previewEl || !point) return;
      const rect = previewEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const normX = (point.x - rect.left) / rect.width - 0.5;
      const normY = (point.y - rect.top) / rect.height - 0.5;
      const tiltX = normY * ASSET_PREVIEW_TILT_MAX_DEG;
      const tiltY = -normX * ASSET_PREVIEW_TILT_MAX_DEG;
      previewEl.style.setProperty("--asset-preview-tilt-x", `${tiltX.toFixed(2)}deg`);
      previewEl.style.setProperty("--asset-preview-tilt-y", `${tiltY.toFixed(2)}deg`);
      currentTiltRef.current = { x: tiltX, y: tiltY };
    });
  };

  const handlePreviewMouseLeave = () => {
    isHoveringRef.current = false;
    tiltPointRef.current = null;
    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }
    resetPreviewTilt();
    startIdleTilt();
  };

  useEffect(() => {
    stopIdleTilt();
    resetPreviewTilt();
    if (!reduceMotionRef.current) {
      startIdleTilt();
    }
    return () => {
      stopIdleTilt();
    };
  }, [asset.id, previewUrl, refreshKey]);

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
  const hasDimensionReduction =
    optimizePreview &&
    (optimizePreview.width < asset.width || optimizePreview.height < asset.height);
  const canApplyOptimization =
    Boolean(optimizePreview) && (hasSizeReduction || hasDimensionReduction);
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
      const { width, height } = await getImageDimensions(file);
      setPendingReplace({ file, width, height, mimeType: file.type });
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
  }, [assets.length, currentIndex, onSelectIndex, safeIndex, showCarousel]);

  const kindStatus = asset.assetKindStatus ?? "unclassified";
  const kindLabel =
    kindStatus === "classifying"
      ? t("label.assetKindClassifying")
      : kindStatus === "classified"
        ? asset.assetKind === "icon"
          ? t("label.assetKindIcon")
          : t("label.assetKindArtwork")
        : t("label.assetKindUnknown");
  const canOverride = kindStatus !== "classifying";
  const applyManualKind = async (kind: "icon" | "artwork") => {
    cancelAsset(asset.id);
    await apiClient.updateAssetMetadata(
      {
        patch: {
          assetKindStatus: "classified",
          assetKind: kind,
          assetKindSource: "manual",
          assetKindConfidence: 1,
          assetKindUpdatedAt: Date.now(),
        },
      },
      { params: { id: asset.id } },
    );
    setIsKindPopoverOpen(false);
  };

  useLayoutEffect(() => {
    if (!isKindPopoverOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      const anchor = kindAnchorRef.current;
      const popover = kindPopoverRef.current;
      if (!anchor || !popover) return;

      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const padding = 12;
      const offset = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = anchorRect.left;
      let top =
        kindPopoverPlacement === "up"
          ? anchorRect.top - popoverRect.height - offset
          : anchorRect.bottom + offset;

      left = Math.min(Math.max(left, padding), viewportWidth - popoverRect.width - padding);
      top = Math.min(Math.max(top, padding), viewportHeight - popoverRect.height - padding);

      setKindPopoverStyle({ left, top, position: "fixed" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isKindPopoverOpen, kindPopoverPlacement]);

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.assetsInspectorBody}>
        <div className={`${styles.assetsInspectorActions} d-flex justify-content-end`}>
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            {t("actions.replaceImage")}
          </button>
          {/*
            Optimization UI is intentionally hidden for now. Do not re-enable without
            addressing the remaining UX issues (comparison clarity, markers, guardrails).
          */}
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
        {showCarousel ? (
          <div className={`${styles.assetsInspectorCarousel} ${styles.uRowLg}`}>
            <button
              type="button"
              className={styles.assetsInspectorCarouselButton}
              onClick={() => onSelectIndex((safeIndex - 1 + assets.length) % assets.length)}
              aria-label={t("actions.previous")}
            >
              <ChevronLeft />
            </button>
            <div className={styles.assetsInspectorCarouselMeta}>
              <div className={styles.assetsInspectorCarouselCount}>
                {assets.length} {assets.length === 1 ? t("label.asset") : t("label.assets")}
              </div>
              <div className={styles.assetsInspectorCarouselIndex}>
                {safeIndex + 1} / {assets.length}
              </div>
            </div>
            <button
              type="button"
              className={styles.assetsInspectorCarouselButton}
              onClick={() => onSelectIndex((safeIndex + 1) % assets.length)}
              aria-label={t("actions.next")}
            >
              <ChevronRight />
            </button>
          </div>
        ) : null}
        <div className={styles.assetsInspectorPreview}>
          <div
            className={styles.assetsInspectorPreviewInner}
            ref={previewInnerRef}
            onMouseMove={handlePreviewMouseMove}
            onMouseLeave={handlePreviewMouseLeave}
            style={
              previewUrl
                ? ({
                    ["--asset-preview-url" as const]: `url("${previewUrl}")`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={asset.name} />
            ) : (
              <div className={styles.assetsInspectorPreviewPlaceholder}>{t("empty.noPreview")}</div>
            )}
          </div>
        </div>
        <div className={styles.assetsInspectorFilename} title={asset.name}>
          {asset.name}
        </div>
        <dl className={styles.assetsInspectorDetails}>
          <div className={styles.uRowLg}>
            <dt>{t("label.assetKind")}</dt>
            <dd>
              <div className={styles.assetsKindPopoverAnchor}>
                <button
                  type="button"
                  ref={kindAnchorRef}
                  className={`${styles.assetsKindBadge} ${
                    kindStatus === "classifying"
                      ? styles.assetsKindBadgeClassifying
                      : kindStatus === "classified"
                        ? asset.assetKind === "icon"
                          ? styles.assetsKindBadgeIcon
                          : styles.assetsKindBadgeArtwork
                        : styles.assetsKindBadgeUnknown
                  }`}
                  onClick={() => {
                    if (!canOverride) return;
                    setIsKindPopoverOpen((prev) => !prev);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={isKindPopoverOpen}
                  disabled={!canOverride}
                >
                  {kindLabel}
                </button>
                {isKindPopoverOpen
                  ? createPortal(
                      <div
                        ref={kindPopoverRef}
                        className={styles.assetsKindPopover}
                        style={
                          kindPopoverStyle ?? {
                            position: "fixed",
                            left: 0,
                            top: 0,
                            opacity: 0,
                            pointerEvents: "none",
                          }
                        }
                        role="dialog"
                      >
                        <div className={styles.assetsKindPopoverTitle}>
                          {t("label.assetKindOverride")}
                        </div>
                        <button
                          type="button"
                          className={styles.assetsKindPopoverOption}
                          onClick={() => void applyManualKind("icon")}
                        >
                          {t("label.assetKindIcon")}
                        </button>
                        <button
                          type="button"
                          className={styles.assetsKindPopoverOption}
                          onClick={() => void applyManualKind("artwork")}
                        >
                          {t("label.assetKindArtwork")}
                        </button>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
              {!canOverride ? (
                <span className={styles.assetsKindPopoverHint}>
                  {t("label.assetKindClassifyingHint")}
                </span>
              ) : null}
            </dd>
          </div>
          <div className={styles.uRowLg}>
            <dt>{t("label.fileType")}</dt>
            <dd>{asset.mimeType}</dd>
          </div>
          <div className={styles.uRowLg}>
            <dt>{t("label.dimensions")}</dt>
            <dd>{dimensionsLabel}</dd>
          </div>
          <div className={styles.uRowLg}>
            <dt>{t("label.dateAdded")}</dt>
            <dd>{formatAssetDate(asset.createdAt)}</dd>
          </div>
          <div className={styles.uRowLg}>
            <dt>{t("label.usedOnCards")}</dt>
            <dd>
              {usage.total} {usage.total === 1 ? t("label.card") : t("label.cards")}
            </dd>
          </div>
        </dl>
      </div>
      <ModalShell
        isOpen={Boolean(pendingReplace)}
        onClose={() => {
          if (isReplacing) return;
          setPendingReplace(null);
          setKeepBackup(false);
        }}
        title={t("heading.replaceImage")}
        footer={
          <>
            <button
              type="button"
              className={styles.templateSecondaryButton}
              onClick={() => {
                if (isReplacing) return;
                setPendingReplace(null);
                setKeepBackup(false);
              }}
              disabled={isReplacing}
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleReplaceConfirm}
              disabled={isReplacing}
            >
              {t("actions.replace")}
            </button>
          </>
        }
      >
        <div className={`${styles.assetsInspectorReplaceBody} ${styles.uStackLg}`}>
          {pendingMismatch ? (
            <div className={styles.assetsInspectorReplaceWarning}>
              {t("confirm.replaceDifferentDimensionsBody")
                .replace("{old}", `${asset.width}×${asset.height}`)
                .replace("{next}", `${pendingReplace?.width ?? 0}×${pendingReplace?.height ?? 0}`)}
            </div>
          ) : (
            <div className={styles.assetsInspectorReplaceInfo}>{t("confirm.replaceBody")}</div>
          )}
          <label className={styles.assetsInspectorReplaceToggle}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={keepBackup}
              onChange={(event) => setKeepBackup(event.target.checked)}
              disabled={isReplacing}
            />
            <span>{t("label.keepBackup")}</span>
          </label>
        </div>
      </ModalShell>
      <ModalShell
        isOpen={isOptimizeOpen}
        onClose={() => {
          if (isApplyingOptimization) return;
          setIsOptimizeOpen(false);
        }}
        title={t("heading.optimizeImage")}
        contentClassName={styles.assetsOptimizePopover}
        footer={
          <div className={styles.assetsOptimizeFooter}>
            <div className={styles.assetsOptimizeFooterHint}>
              {t("helper.optimizeOverwrite")}
            </div>
            <div className={styles.assetsOptimizeFooterActions}>
              <button
                type="button"
                className={styles.templateSecondaryButton}
                onClick={() => setIsOptimizeOpen(false)}
                disabled={isApplyingOptimization}
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void handleOptimizeApply()}
                disabled={
                  isOptimizing ||
                  isApplyingOptimization ||
                  !optimizePreview ||
                  !canApplyOptimization
                }
              >
                {t("actions.apply")}
              </button>
            </div>
          </div>
        }
      >
        <div className={styles.assetsOptimizeBody}>
          <div className={styles.assetsOptimizeLayout}>
            <div className={styles.assetsOptimizePreview}>
              <div className={styles.assetsOptimizePanel}>
                <div className={styles.assetsOptimizeLabel}>{t("label.original")}</div>
                <div
                  className={styles.assetsOptimizeFrame}
                  ref={originalFrameRef}
                  onMouseMove={handleInspectMove}
                  onMouseLeave={handleInspectLeave}
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={asset.name}
                      style={buildInspectStyle(originalFrameSize, {
                        width: asset.width,
                        height: asset.height,
                      })}
                    />
                  ) : (
                    <div className={styles.assetsOptimizePlaceholder}>
                      {t("empty.noPreview")}
                    </div>
                  )}
                  <div className={styles.assetsOptimizeZoomBadge}>
                    {t("label.zoom")} {INSPECT_ZOOM}×
                  </div>
                </div>
              </div>
              <div className={styles.assetsOptimizePanel}>
                <div className={styles.assetsOptimizeLabel}>{t("label.optimized")}</div>
                <div
                  className={`${styles.assetsOptimizeFrame} ${styles.assetsOptimizeFrameFill}`}
                  ref={optimizedFrameRef}
                  onMouseMove={handleInspectMove}
                  onMouseLeave={handleInspectLeave}
                >
                  {optimizePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optimizePreview.url}
                      alt={asset.name}
                      style={buildInspectStyle(optimizedFrameSize, {
                        width: optimizePreview.width,
                        height: optimizePreview.height,
                      })}
                    />
                  ) : (
                    <div className={styles.assetsOptimizePlaceholder}>
                      {isOptimizing ? t("status.optimizing") : t("empty.noPreview")}
                    </div>
                  )}
                  <div className={styles.assetsOptimizeZoomBadge}>
                    {t("label.zoom")} {INSPECT_ZOOM}×
                  </div>
                </div>
              </div>
            </div>
            <aside className={styles.assetsOptimizeSidebar}>
              {optimizeStatus ? (
                <div className={styles.assetsOptimizeStatus}>
                  <span>{optimizeStatus}</span>
                  {optimizeReasons.length > 0 ? (
                    <span className={styles.assetsOptimizeInfo}>
                      <span
                        className={styles.assetsOptimizeInfoIcon}
                        aria-label={t("label.moreInfo")}
                      >
                        i
                      </span>
                      <div className={styles.assetsOptimizeInfoPopover}>
                        {optimizeReasons.map((reason) => (
                          <div key={reason}>{reason}</div>
                        ))}
                      </div>
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.assetsOptimizeControls}>
                <div className={styles.assetsOptimizeControlRow}>
                  <label htmlFor="optimize-scale">{t("label.scale")}</label>
                  <div className={styles.assetsOptimizeSlider}>
                    <div className={styles.assetsOptimizeSliderTrack}>
                      <input
                        id="optimize-scale"
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={optimizeScalePercent}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (!Number.isFinite(nextValue)) return;
                          setOptimizeScalePercent(Math.min(100, Math.max(10, nextValue)));
                        }}
                      />
                      {typeof pixelationThresholdPercent === "number" ? (
                        <div
                          className={styles.assetsOptimizeSliderMarker}
                          style={{ left: `${pixelationThresholdPercent}%` }}
                          title={t("label.pixelationThreshold")}
                        />
                      ) : null}
                    </div>
                    <span>{optimizeScalePercent}%</span>
                  </div>
                </div>
                {isJpegLike ? (
                  <div className={styles.assetsOptimizeControlRow}>
                    <label htmlFor="optimize-quality">{t("label.quality")}</label>
                    <div className={styles.assetsOptimizeSlider}>
                      <div className={styles.assetsOptimizeSliderTrack}>
                        <input
                          id="optimize-quality"
                          type="range"
                          min={10}
                          max={100}
                          step={1}
                          value={Math.round(optimizeQuality * 100)}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            const clamped = Math.min(100, Math.max(10, nextValue));
                            setOptimizeQuality(clamped / 100);
                          }}
                        />
                      </div>
                      <span>{Math.round(optimizeQuality * 100)}%</span>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.assetsOptimizeSummary}>
                <div>
                  {t("label.originalResolution")}: {asset.width}×{asset.height}
                </div>
                <div>
                  {t("label.optimizedResolution")}:{" "}
                  {optimizePreview
                    ? `${optimizePreview.width}×${optimizePreview.height}`
                    : "—"}
                </div>
                <div>
                  {t("label.originalSize")}:{" "}
                  {optimizeSource ? formatBytes(optimizeSource.size) : "—"}
                </div>
                <div>
                  {t("label.optimizedSize")}:{" "}
                  {optimizePreview ? formatBytes(optimizePreview.bytes) : "—"}
                </div>
            <div>
              {t("label.sizeChange")}:{" "}
              {optimizeSource && optimizePreview ? (
                <span
                  className={
                    hasSizeReduction
                      ? styles.assetsOptimizeDeltaGood
                      : hasSizeIncrease
                        ? styles.assetsOptimizeDeltaBad
                        : undefined
                  }
                >
                  {(() => {
                    if (optimizeSource.size === 0) return "—";
                    const diff = optimizePreview.bytes - optimizeSource.size;
                    if (diff === 0) return t("label.sizeUnchanged");
                    const percent = Math.abs(diff) / optimizeSource.size;
                    const percentLabel = `${Math.round(percent * 100)}%`;
                    return diff < 0
                      ? `${t("label.sizeReduction")} ${percentLabel}`
                      : `${t("label.sizeIncrease")} ${percentLabel}`;
                  })()}
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
              {optimizeError ? (
                <div className={styles.assetsOptimizeError}>{optimizeError}</div>
              ) : null}
            </aside>
          </div>
        </div>
      </ModalShell>
    </aside>
  );
}

export default function AssetsRoutePanels() {
  const [selectedAssets, setSelectedAssets] = useState<AssetRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { setIsActive } = useAssetKindQueue();

  useEffect(() => {
    setIsActive(true);
    return () => {
      setIsActive(false);
    };
  }, [setIsActive]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(0);
  }, [selectedAssets]);

  useEffect(() => {
    if (currentIndex >= selectedAssets.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, selectedAssets.length]);

  return (
    <>
      <section className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3`}>
        <AssetsMainPanel onSelectionChange={setSelectedAssets} refreshKey={refreshKey} />
      </section>
      {selectedAssets.length > 0 ? (
        <AssetsInspector
          assets={selectedAssets}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          onReplaceComplete={() => setRefreshKey((prev) => prev + 1)}
          onOptimizeComplete={() => setRefreshKey((prev) => prev + 1)}
          refreshKey={refreshKey}
        />
      ) : null}
    </>
  );
}
