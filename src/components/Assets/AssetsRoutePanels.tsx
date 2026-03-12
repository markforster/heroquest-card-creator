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
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";

import type { ChangeEvent } from "react";

type AssetUsage = {
  total: number;
};

const ASSET_PREVIEW_TILT_MAX_DEG = 8;

function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function AssetsInspector({
  assets,
  currentIndex,
  onSelectIndex,
  onReplaceComplete,
  refreshKey,
}: {
  assets: AssetRecord[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onReplaceComplete: () => void;
  refreshKey: number;
}) {
  const { t } = useI18n();
  const { enqueueAsset, cancelAsset } = useAssetKindQueue();
  const safeIndex = Math.min(currentIndex, assets.length - 1);
  const asset = assets[safeIndex];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usage, setUsage] = useState<AssetUsage>({ total: 0 });
  const [pendingReplace, setPendingReplace] = useState<{
    file: File;
    width: number;
    height: number;
    mimeType: string;
  } | null>(null);
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
        const total = cards.filter(
          (card) => card.imageAssetId === asset.id || card.monsterIconAssetId === asset.id,
        ).length;
        setUsage({ total });
      } catch {
        if (!cancelled) {
          setUsage({ total: 0 });
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
  }, [asset.id]);

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
          refreshKey={refreshKey}
        />
      ) : null}
    </>
  );
}
