"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "@/app/page.module.css";
import AssetInspectorPreview from "@/components/Assets/AssetInspectorPreview";
import { useI18n } from "@/i18n/I18nProvider";
import { getDisplayAssetName } from "@/lib/asset-filename";

type AssetsInspectorHeroProps = {
  assetsCount: number;
  safeIndex: number;
  assetName: string;
  previewUrl: string | null;
  isPreviewLoading: boolean;
  showCarousel: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPreview: () => void;
};

export default function AssetsInspectorHero({
  assetsCount,
  safeIndex,
  assetName,
  previewUrl,
  isPreviewLoading,
  showCarousel,
  onPrevious,
  onNext,
  onOpenPreview,
}: AssetsInspectorHeroProps) {
  const { t } = useI18n();
  const displayName = getDisplayAssetName(assetName);

  return (
    <>
      {showCarousel ? (
        <div className={`${styles.assetsInspectorCarousel} ${styles.uRowLg}`}>
          <button
            type="button"
            className={styles.assetsInspectorCarouselButton}
            onClick={onPrevious}
            aria-label={t("actions.previous")}
          >
            <ChevronLeft />
          </button>
          <div className={styles.assetsInspectorCarouselMeta}>
            <div className={styles.assetsInspectorCarouselCount}>
              {assetsCount} {assetsCount === 1 ? t("label.asset") : t("label.assets")}
            </div>
            <div className={styles.assetsInspectorCarouselIndex}>
              {safeIndex + 1} / {assetsCount}
            </div>
          </div>
          <button
            type="button"
            className={styles.assetsInspectorCarouselButton}
            onClick={onNext}
            aria-label={t("actions.next")}
          >
            <ChevronRight />
          </button>
        </div>
      ) : null}
      <AssetInspectorPreview
        previewUrl={previewUrl}
        isLoading={isPreviewLoading}
        alt={assetName}
        emptyContent={t("empty.noPreview")}
        interactive
        onClick={onOpenPreview}
        ariaLabel={`${t("label.preview")}: ${displayName}`}
      />
      <div className={styles.assetsInspectorFilename} title={displayName}>
        {displayName}
      </div>
    </>
  );
}
