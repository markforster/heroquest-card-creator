"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import AssetsMainPanel from "@/components/Assets/AssetsMainPanel";
import { useI18n } from "@/i18n/I18nProvider";
import type { AssetRecord } from "@/lib/assets-db";
import { getAssetObjectUrl } from "@/lib/assets-db";
import { listCards } from "@/lib/cards-db";

type AssetUsage = {
  total: number;
};

function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function AssetsInspector({
  assets,
  currentIndex,
  onSelectIndex,
}: {
  assets: AssetRecord[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  const { t } = useI18n();
  const safeIndex = Math.min(currentIndex, assets.length - 1);
  const asset = assets[safeIndex];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usage, setUsage] = useState<AssetUsage>({ total: 0 });
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
  }, [asset.id]);

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
    </aside>
  );
}

export default function AssetsRoutePanels() {
  const [selectedAssets, setSelectedAssets] = useState<AssetRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
        <AssetsMainPanel onSelectionChange={setSelectedAssets} />
      </section>
      {selectedAssets.length > 0 ? (
        <AssetsInspector
          assets={selectedAssets}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
        />
      ) : null}
    </>
  );
}
