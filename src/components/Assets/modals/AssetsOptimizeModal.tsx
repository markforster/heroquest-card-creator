"use client";

import styles from "@/app/page.module.css";
import type {
  FrameSize,
  OptimizePreviewState,
} from "@/components/Assets/AssetsInspector.types";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import type { CSSProperties, MouseEvent, Ref } from "react";

type AssetsOptimizeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  isApplyingOptimization: boolean;
  isOptimizing: boolean;
  optimizePreview: OptimizePreviewState | null;
  canApplyOptimization: boolean;
  optimizeStatus: string | null;
  optimizeReasons: string[];
  previewUrl: string | null;
  assetName: string;
  originalFrameRef: Ref<HTMLDivElement>;
  optimizedFrameRef: Ref<HTMLDivElement>;
  onInspectMove: (event: MouseEvent<HTMLDivElement>) => void;
  onInspectLeave: () => void;
  buildInspectStyle: (
    frame: FrameSize,
    image: { width: number; height: number } | null,
  ) => CSSProperties;
  originalFrameSize: FrameSize;
  optimizedFrameSize: FrameSize;
  assetWidth: number;
  assetHeight: number;
  optimizeScalePercent: number;
  onOptimizeScaleChange: (value: number) => void;
  pixelationThresholdPercent: number | null;
  isJpegLike: boolean;
  optimizeQuality: number;
  onOptimizeQualityChange: (value: number) => void;
  originalSize: string;
  optimizedSize: string;
  sizeChangeValue: string;
  sizeChangeClassName?: string;
  optimizeError: string | null;
};

export default function AssetsOptimizeModal({
  isOpen,
  onClose,
  onApply,
  isApplyingOptimization,
  isOptimizing,
  optimizePreview,
  canApplyOptimization,
  optimizeStatus,
  optimizeReasons,
  previewUrl,
  assetName,
  originalFrameRef,
  optimizedFrameRef,
  onInspectMove,
  onInspectLeave,
  buildInspectStyle,
  originalFrameSize,
  optimizedFrameSize,
  assetWidth,
  assetHeight,
  optimizeScalePercent,
  onOptimizeScaleChange,
  pixelationThresholdPercent,
  isJpegLike,
  optimizeQuality,
  onOptimizeQualityChange,
  originalSize,
  optimizedSize,
  sizeChangeValue,
  sizeChangeClassName,
  optimizeError,
}: AssetsOptimizeModalProps) {
  const { t } = useI18n();
  const inspectZoom = 2;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.optimizeImage")}
      contentClassName={styles.assetsReplacePopover}
      footer={
        <div className={styles.assetsOptimizeFooter}>
          <div className={styles.assetsOptimizeFooterHint}>
            {t("helper.optimizeOverwrite")}
          </div>
          <div className={styles.assetsOptimizeFooterActions}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={isApplyingOptimization}
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onApply}
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
                onMouseMove={onInspectMove}
                onMouseLeave={onInspectLeave}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={assetName}
                    style={buildInspectStyle(originalFrameSize, {
                      width: assetWidth,
                      height: assetHeight,
                    })}
                  />
                ) : (
                  <div className={styles.assetsOptimizePlaceholder}>{t("empty.noPreview")}</div>
                )}
                <div className={styles.assetsOptimizeZoomBadge}>
                  {t("label.zoom")} {inspectZoom}×
                </div>
              </div>
            </div>
            <div className={styles.assetsOptimizePanel}>
              <div className={styles.assetsOptimizeLabel}>{t("label.optimized")}</div>
              <div
                className={`${styles.assetsOptimizeFrame} ${styles.assetsOptimizeFrameFill}`}
                ref={optimizedFrameRef}
                onMouseMove={onInspectMove}
                onMouseLeave={onInspectLeave}
              >
                {optimizePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optimizePreview.url}
                    alt={assetName}
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
                  {t("label.zoom")} {inspectZoom}×
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
                      title={optimizeReasons.join("\n")}
                    >
                      i
                    </span>
                  </span>
                ) : null}
              </div>
            ) : null}
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
                    onChange={(event) => onOptimizeScaleChange(Number(event.target.value))}
                  />
                  {pixelationThresholdPercent != null ? (
                    <div
                      className={styles.assetsOptimizeThreshold}
                      style={{ left: `${pixelationThresholdPercent}%` }}
                    />
                  ) : null}
                </div>
                <span>{optimizeScalePercent}%</span>
              </div>
            </div>
            {!isJpegLike ? (
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
                      onChange={(event) => onOptimizeQualityChange(Number(event.target.value))}
                    />
                  </div>
                  <span>{Math.round(optimizeQuality * 100)}%</span>
                </div>
              </div>
            ) : null}
            <div className={styles.assetsReplaceSummary}>
              <div>
                {t("label.originalResolution")}: {`${assetWidth}×${assetHeight}`}
              </div>
              <div>
                {t("label.optimizedResolution")}:{" "}
                {optimizePreview ? `${optimizePreview.width}×${optimizePreview.height}` : "—"}
              </div>
              <div>
                {t("label.originalSize")}: {originalSize}
              </div>
              <div>
                {t("label.optimizedSize")}: {optimizedSize}
              </div>
              <div>
                {t("label.sizeChange")}:{" "}
                <strong className={sizeChangeClassName}>{sizeChangeValue}</strong>
              </div>
              {optimizeError ? (
                <div className={styles.assetsOptimizeError}>{optimizeError}</div>
              ) : null}
              {pixelationThresholdPercent != null ? (
                <div className={styles.assetsOptimizeHint}>
                  {t("label.pixelationThreshold")}: {pixelationThresholdPercent}%
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </ModalShell>
  );
}
