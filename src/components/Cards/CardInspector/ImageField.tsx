"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  ImagePlus,
  RotateCcw,
  SlidersHorizontal,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { AssetsModal } from "@/components/Assets";
import IconButton from "@/components/common/IconButton";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { getAllAssets } from "@/lib/assets-db";
import type { AssetRecord } from "@/lib/assets-db";

type ImageFieldProps = {
  label: string;
  boundsWidth?: number;
  boundsHeight?: number;
};

type LastClearedImage = {
  id: string;
  name?: string;
  width?: number;
  height?: number;
};

export default function ImageField({ label, boundsWidth, boundsHeight }: ImageFieldProps) {
  const { t } = useI18n();
  const {
    setValue,
    formState: { errors },
  } = useFormContext();
  const imageAssetId = useWatch({ name: "imageAssetId" }) as string | undefined;
  const imageAssetNameWatch = useWatch({ name: "imageAssetName" }) as string | undefined;
  const imageOriginalWidthWatch = useWatch({
    name: "imageOriginalWidth",
  }) as number | undefined;
  const imageOriginalHeightWatch = useWatch({
    name: "imageOriginalHeight",
  }) as number | undefined;
  const imageScaleWatch = useWatch({ name: "imageScale" }) as number | undefined;
  const imageOffsetXWatch = useWatch({ name: "imageOffsetX" }) as number | undefined;
  const imageOffsetYWatch = useWatch({ name: "imageOffsetY" }) as number | undefined;
  const imageRotationWatch = useWatch({ name: "imageRotation" }) as number | undefined;
  const picker = usePopupState(false);

  const fieldError = (errors as Record<string, { message?: string }>).imageAssetId;

  const imageAssetName = imageAssetNameWatch;
  const imageScale = imageScaleWatch ?? 1;
  const imageOffsetX = imageOffsetXWatch ?? 0;
  const imageOffsetY = imageOffsetYWatch ?? 0;
  const imageRotation = imageRotationWatch ?? 0;
  const imageOriginalWidth = imageOriginalWidthWatch;
  const imageOriginalHeight = imageOriginalHeightWatch;
  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);
  const adjustmentsButtonRef = useRef<HTMLButtonElement | null>(null);
  const adjustmentsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [adjustmentsStyle, setAdjustmentsStyle] = useState<CSSProperties | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [lastCleared, setLastCleared] = useState<LastClearedImage | null>(null);

  const maxOffsetX = boundsWidth ? Math.round(boundsWidth) : 300;
  const maxOffsetY = boundsHeight ? Math.round(boundsHeight) : 300;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.05;
  const MIN_ROTATION = -180;
  const MAX_ROTATION = 180;
  const ROTATION_STEP = 1;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const computeAutoScale = () => {
    if (
      boundsWidth &&
      boundsHeight &&
      imageOriginalWidth &&
      imageOriginalHeight &&
      imageOriginalWidth > 0 &&
      imageOriginalHeight > 0
    ) {
      const bw = boundsWidth;
      const bh = boundsHeight;
      const aw = imageOriginalWidth;
      const ah = imageOriginalHeight;

      return Math.max(bw / aw, bh / ah);
    }
    return 1;
  };

  const applyAssetSelection = (asset: AssetRecord) => {
    setValue("imageAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
    setValue("imageAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
    setValue("imageRotation", 0, { shouldDirty: true, shouldTouch: true });

    if (boundsWidth && boundsHeight && asset.width && asset.height) {
      const bw = boundsWidth;
      const bh = boundsHeight;
      const aw = asset.width;
      const ah = asset.height;

      let scale = 1;
      if (aw > 0 && ah > 0) {
        scale = Math.max(bw / aw, bh / ah);
      }

      setValue("imageScale", scale, { shouldDirty: true, shouldTouch: true });
      setValue("imageOriginalWidth", aw, { shouldDirty: true, shouldTouch: true });
      setValue("imageOriginalHeight", ah, { shouldDirty: true, shouldTouch: true });
      setValue("imageOffsetX", 0, { shouldDirty: true, shouldTouch: true });
      setValue("imageOffsetY", 0, { shouldDirty: true, shouldTouch: true });
    }
  };

  const handleSelect = (asset: AssetRecord) => {
    applyAssetSelection(asset);
    setLastCleared(null);
  };

  const handleRestoreLastCleared = async () => {
    if (!lastCleared) return;

    let width = lastCleared.width;
    let height = lastCleared.height;
    let name = lastCleared.name;

    if (!width || !height) {
      try {
        const assets = await getAllAssets();
        const match = assets.find((asset) => asset.id === lastCleared.id);
        if (match) {
          width = match.width;
          height = match.height;
          name = match.name;
        }
      } catch {
        // ignore lookup errors; fall back to partial restore
      }
    }

    if (width && height) {
      applyAssetSelection({
        id: lastCleared.id,
        name: name ?? lastCleared.id,
        width,
        height,
        mimeType: "image/unknown",
        createdAt: Date.now(),
      });
    } else {
      setValue("imageAssetId", lastCleared.id, { shouldDirty: true, shouldTouch: true });
      if (name) {
        setValue("imageAssetName", name, { shouldDirty: true, shouldTouch: true });
      }
    }

    setLastCleared(null);
  };

  useEffect(() => {
    if (!imageAssetId) {
      setIsAdjustmentsOpen(false);
    }
  }, [imageAssetId]);

  useOutsideClick(
    [adjustmentsPopoverRef, adjustmentsButtonRef],
    () => setIsAdjustmentsOpen(false),
    isAdjustmentsOpen,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const positionPopover = () => {
    const anchor = adjustmentsButtonRef.current;
    const popover = adjustmentsPopoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const padding = 12;
    const offset = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceLeft = anchorRect.left - padding - offset;
    const clampedWidth = Math.max(240, Math.min(520, spaceLeft));
    popover.style.width = `${clampedWidth}px`;

    const { width, height } = popover.getBoundingClientRect();

    const left = Math.max(anchorRect.left - width - offset, padding);
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    let top = anchorCenterY;
    top = Math.min(Math.max(top, padding + height / 2), viewportHeight - padding - height / 2);

    setAdjustmentsStyle({ left, top });
  };

  useLayoutEffect(() => {
    if (!isAdjustmentsOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      positionPopover();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isAdjustmentsOpen]);

  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
      <div className="input-group input-group-sm mb-2">
        <input
          type="text"
          className={`form-control ${layoutStyles.imageHeaderStatus} ${
            imageAssetId ? "" : layoutStyles.imageHeaderStatusMissing
          }`}
          readOnly
          value={
            imageAssetId
              ? (imageAssetName ?? t("status.imageSelected"))
              : t("status.noImageSelected")
          }
          title={imageAssetId ? (imageAssetName ?? imageAssetId) : undefined}
        />
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={ImagePlus}
          title={t("tooltip.openImagePicker")}
          onClick={() => {
            picker.open();
          }}
        >
          {t("actions.chooseImage")}
        </IconButton>
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={SlidersHorizontal}
          title={t("form.imageAdjustments")}
          disabled={!imageAssetId}
          buttonRef={adjustmentsButtonRef}
          iconOnly
          onClick={() => {
            setIsAdjustmentsOpen((prev) => {
              const next = !prev;
              if (next) {
                requestAnimationFrame(() => {
                  positionPopover();
                });
              }
              return next;
            });
          }}
        >
          <span className="visually-hidden">{t("form.imageAdjustments")}</span>
        </IconButton>
        {imageAssetId ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={XCircle}
            title={t("tooltip.clearSelectedImage")}
            onClick={() => {
              if (imageAssetId) {
                setLastCleared({
                  id: imageAssetId,
                  name: imageAssetName,
                  width: imageOriginalWidth,
                  height: imageOriginalHeight,
                });
              }
              setValue("imageAssetId", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageAssetName", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageScale", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageOriginalWidth", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageOriginalHeight", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageOffsetX", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageOffsetY", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("imageRotation", undefined, { shouldDirty: true, shouldTouch: true });
            }}
          >
            <span className="visually-hidden">{t("actions.clear")}</span>
          </IconButton>
        ) : lastCleared ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={RotateCcw}
            title={t("tooltip.restoreSelectedImage")}
            onClick={() => {
              void handleRestoreLastCleared();
            }}
          >
            <span className="visually-hidden">{t("actions.restore")}</span>
          </IconButton>
        ) : null}
      </div>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
      {isAdjustmentsOpen && imageAssetId && isClient
        ? createPortal(
            <div
              ref={adjustmentsPopoverRef}
              className={layoutStyles.imageAdjustmentsPopover}
              style={adjustmentsStyle ?? undefined}
            >
              <div className={layoutStyles.imageAdjustmentsPopoverContent}>
                <div className={layoutStyles.imageControlGroup}>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.horizontalPosition")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={-maxOffsetX}
                      max={maxOffsetX}
                      step={1}
                      value={imageOffsetX}
                      title={t("tooltip.adjustHorizontal")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageOffsetX", next, {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeLeft")}
                      onClick={() => {
                        setValue("imageOffsetX", imageOffsetX - 1, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeRight")}
                      onClick={() => {
                        setValue("imageOffsetX", imageOffsetX + 1, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.centerHorizontal")}
                      onClick={() => {
                        setValue("imageOffsetX", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <Crosshair className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.verticalPosition")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={-maxOffsetY}
                      max={maxOffsetY}
                      step={1}
                      value={imageOffsetY}
                      title={t("tooltip.adjustVertical")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageOffsetY", next, {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeUp")}
                      onClick={() => {
                        setValue("imageOffsetY", imageOffsetY - 1, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronUp className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeDown")}
                      onClick={() => {
                        setValue("imageOffsetY", imageOffsetY + 1, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronDown className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.centerVertical")}
                      onClick={() => {
                        setValue("imageOffsetY", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <Crosshair className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.scale")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={MIN_SCALE}
                      max={MAX_SCALE}
                      step={SCALE_STEP}
                      value={imageScale}
                      title={t("tooltip.adjustScale")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageScale", clamp(next, MIN_SCALE, MAX_SCALE), {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.zoomOut")}
                      onClick={() => {
                        const next = clamp(imageScale - SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("imageScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ZoomOut className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.zoomIn")}
                      onClick={() => {
                        const next = clamp(imageScale + SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("imageScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ZoomIn className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.autoScale")}
                      onClick={() => {
                        const auto = computeAutoScale();
                        const next = clamp(auto, MIN_SCALE, MAX_SCALE);
                        setValue("imageScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <RotateCcw className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.rotation")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={MIN_ROTATION}
                      max={MAX_ROTATION}
                      step={ROTATION_STEP}
                      value={imageRotation}
                      title={t("tooltip.adjustRotation")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageRotation", next, {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.rotateLeft")}
                      onClick={() => {
                        const next = clamp(imageRotation - ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("imageRotation", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.rotateRight")}
                      onClick={() => {
                        const next = clamp(imageRotation + ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("imageRotation", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.resetRotation")}
                      onClick={() => {
                        setValue("imageRotation", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <RotateCcw className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <AssetsModal
        isOpen={picker.isOpen}
        onClose={picker.close}
        mode="select"
        onSelect={handleSelect}
      />
    </div>
  );
}
