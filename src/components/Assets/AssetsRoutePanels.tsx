"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import styles from "@/app/page.module.css";
import AssetsMainPanel from "@/components/Assets/AssetsMainPanel";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import type { AssetRecord } from "@/lib/assets-db";
import { addAsset, getAllAssets, getAssetBlob, getAssetObjectUrl, replaceAsset } from "@/lib/assets-db";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { generateId } from "@/lib";
import { listCards } from "@/lib/cards-db";

type AssetUsage = {
  total: number;
};

function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return dimensions;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
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
  const showCarousel = assets.length > 1;

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    (async () => {
      try {
        url = await getAssetObjectUrl(asset.id);
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
        const cards = await listCards();
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
  }, [asset.id]);

  const handleReplaceConfirm = async () => {
    if (!pendingReplace) return;
    setIsReplacing(true);
    try {
      if (keepBackup) {
        const existingBlob = await getAssetBlob(asset.id);
        if (existingBlob) {
          const allAssets = await getAllAssets();
          const existingNames = new Set(allAssets.map((item) => item.name));
          const dateStamp = new Date().toISOString().slice(0, 10);
          const backupBase = `${asset.name} (backup ${dateStamp})`;
          const backupName = getNextAvailableFilename(existingNames, backupBase);
          await addAsset(
            generateId(),
            existingBlob,
            {
              name: backupName,
              mimeType: asset.mimeType,
              width: asset.width,
              height: asset.height,
            },
          );
        } else {
          window.alert(t("alert.replaceBackupFailed"));
        }
      }

      await replaceAsset(
        asset.id,
        pendingReplace.file,
        {
          name: asset.name,
          mimeType: pendingReplace.mimeType,
          width: pendingReplace.width,
          height: pendingReplace.height,
        },
        asset.createdAt,
      );
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
  }, [assets.length, currentIndex, onSelectIndex, showCarousel]);

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.assetsInspectorBody}>
        <div className={styles.assetsInspectorActions}>
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
          <div className={styles.assetsInspectorCarousel}>
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
          <div className={styles.assetsInspectorPreviewInner}>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={asset.name} />
            ) : (
              <div className={styles.assetsInspectorPreviewPlaceholder}>
                {t("empty.noPreview")}
              </div>
            )}
          </div>
        </div>
        <div className={styles.assetsInspectorFilename} title={asset.name}>
          {asset.name}
        </div>
        <dl className={styles.assetsInspectorDetails}>
          <div>
            <dt>{t("label.fileType")}</dt>
            <dd>{asset.mimeType}</dd>
          </div>
          <div>
            <dt>{t("label.dimensions")}</dt>
            <dd>{dimensionsLabel}</dd>
          </div>
          <div>
            <dt>{t("label.dateAdded")}</dt>
            <dd>{formatAssetDate(asset.createdAt)}</dd>
          </div>
        </dl>
        <div className={styles.assetsInspectorUsage}>
          <div className={styles.assetsInspectorSectionTitle}>{t("label.usedOnCards")}</div>
          <div className={styles.assetsInspectorUsageCount}>
            {usage.total} {usage.total === 1 ? t("label.card") : t("label.cards")}
          </div>
        </div>
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
        <div className={styles.assetsInspectorReplaceBody}>
          {pendingMismatch ? (
            <div className={styles.assetsInspectorReplaceWarning}>
              {t("confirm.replaceDifferentDimensionsBody")
                .replace("{old}", `${asset.width}×${asset.height}`)
                .replace(
                  "{next}",
                  `${pendingReplace?.width ?? 0}×${pendingReplace?.height ?? 0}`,
                )}
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
      <section className={styles.leftPanel}>
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
