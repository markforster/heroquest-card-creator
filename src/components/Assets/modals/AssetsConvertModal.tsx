"use client";

import styles from "@/app/page.module.css";
import type { ConvertPreviewState } from "@/components/Assets/AssetsInspector.types";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

import type { CSSProperties, MouseEvent, Ref } from "react";

type AssetsConvertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  isApplyingConvert: boolean;
  isConverting: boolean;
  convertPreview: ConvertPreviewState | null;
  assetName: string;
  convertError: string | null;
  convertFrameRef: Ref<HTMLDivElement>;
  convertImgRef: Ref<HTMLImageElement>;
  convertInspectRef: Ref<HTMLDivElement>;
  onMouseEnter: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  containerStyle?: CSSProperties;
  onPreviewImageLoad: (width: number, height: number) => void;
  convertInspect: boolean;
  convertImageWidth: number;
  convertImageHeight: number;
  convertPanX: number;
  convertPanY: number;
  originalSize: string;
  convertedSize: string;
  sizeChangeValue: string;
  convertQuality: number;
  onConvertQualityChange: (value: number) => void;
};

export default function AssetsConvertModal({
  isOpen,
  onClose,
  onApply,
  isApplyingConvert,
  isConverting,
  convertPreview,
  assetName,
  convertError,
  convertFrameRef,
  convertImgRef,
  convertInspectRef,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  containerStyle,
  onPreviewImageLoad,
  convertInspect,
  convertImageWidth,
  convertImageHeight,
  convertPanX,
  convertPanY,
  originalSize,
  convertedSize,
  sizeChangeValue,
  convertQuality,
  onConvertQualityChange,
}: AssetsConvertModalProps) {
  const { t } = useI18n();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.convertToJpeg")}
      contentClassName={styles.assetsOptimizePopover}
      footer={
        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            disabled={isApplyingConvert}
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onApply}
            disabled={isApplyingConvert || isConverting || !convertPreview}
          >
            {t("actions.apply")}
          </button>
        </div>
      }
    >
      <div className={styles.assetsOptimizeBody}>
        <div className={styles.assetsConvertLayout}>
          <div className={styles.assetsReplacePanel}>
            <div className={styles.assetsReplaceLabel}>{t("label.preview")}</div>
            <div className={styles.assetsInspectorPreview}>
              <div
                className={styles.assetsInspectorPreviewInner}
                ref={convertFrameRef}
                onMouseEnter={onMouseEnter}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                style={containerStyle}
              >
                {convertPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={convertImgRef}
                      src={convertPreview.url}
                      alt={assetName}
                      onLoad={(event) =>
                        onPreviewImageLoad(
                          event.currentTarget.naturalWidth,
                          event.currentTarget.naturalHeight,
                        )
                      }
                      style={convertInspect ? { opacity: 0 } : undefined}
                    />
                    <div
                      className={styles.assetsConvertInspectViewport}
                      ref={convertInspectRef}
                    >
                      {convertInspect ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={convertPreview.url}
                          alt=""
                          className={styles.assetsConvertInspectOverlay}
                          style={{
                            width: `${convertImageWidth}px`,
                            height: `${convertImageHeight}px`,
                            transform: `translate(${convertPanX}px, ${convertPanY}px)`,
                          }}
                        />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className={styles.assetsInspectorPreviewPlaceholder}>
                    {isConverting
                      ? t("status.optimizing")
                      : convertError || t("empty.noPreview")}
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className={styles.assetsReplaceSidebar}>
            <div className={styles.assetsReplaceSummary}>
              <div>
                {t("label.originalSize")}: {originalSize}
              </div>
              <div>
                {t("label.convertedSize")}: {convertedSize}
              </div>
              <div>
                {t("label.sizeChange")}: <strong>{sizeChangeValue}</strong>
              </div>
            </div>
            <div className={styles.assetsOptimizeControlRow}>
              <label htmlFor="convert-quality">{t("label.quality")}</label>
              <div className={styles.assetsOptimizeSlider}>
                <div className={styles.assetsOptimizeSliderTrack}>
                  <input
                    id="convert-quality"
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={Math.round(convertQuality * 100)}
                    onChange={(event) => onConvertQualityChange(Number(event.target.value))}
                  />
                </div>
                <span>{Math.round(convertQuality * 100)}%</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ModalShell>
  );
}
