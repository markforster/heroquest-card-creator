"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Crosshair, ImagePlus, RotateCcw, SlidersHorizontal, XCircle, ZoomIn, ZoomOut } from "lucide-react";
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

type MonsterIconFieldProps = {
  label: string;
};

export default function MonsterIconField({ label }: MonsterIconFieldProps) {
  const { t } = useI18n();
  const {
    setValue,
    formState: { errors },
  } = useFormContext();

  const iconAssetId = useWatch({ name: "iconAssetId" }) as string | undefined;
  const iconAssetNameWatch = useWatch({ name: "iconAssetName" }) as string | undefined;
  const iconOffsetXWatch = useWatch({ name: "iconOffsetX" }) as number | undefined;
  const iconOffsetYWatch = useWatch({ name: "iconOffsetY" }) as number | undefined;
  const iconScaleWatch = useWatch({ name: "iconScale" }) as number | undefined;
  const iconRotationWatch = useWatch({ name: "iconRotation" }) as number | undefined;
  const picker = usePopupState(false);

  const fieldError = (errors as Record<string, { message?: string }>).iconAssetId;
  const iconAssetName = iconAssetNameWatch;
  const iconOffsetX = Number.isFinite(iconOffsetXWatch) ? (iconOffsetXWatch as number) : 0;
  const iconOffsetY = Number.isFinite(iconOffsetYWatch) ? (iconOffsetYWatch as number) : 0;
  const iconScale = Number.isFinite(iconScaleWatch) ? (iconScaleWatch as number) : 1;
  const iconRotation = Number.isFinite(iconRotationWatch) ? (iconRotationWatch as number) : 0;

  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);
  const adjustmentsButtonRef = useRef<HTMLButtonElement | null>(null);
  const adjustmentsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [adjustmentsStyle, setAdjustmentsStyle] = useState<CSSProperties | null>(null);
  const [isClient, setIsClient] = useState(false);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.05;
  const MIN_ROTATION = -180;
  const MAX_ROTATION = 180;
  const ROTATION_STEP = 1;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
      <div className="input-group input-group-sm">
        <input
          type="text"
          className={`form-control ${layoutStyles.imageHeaderStatus} ${
            iconAssetId ? "" : layoutStyles.imageHeaderStatusMissing
          }`}
          readOnly
          value={
            iconAssetId
              ? (iconAssetName ?? t("status.imageSelected"))
              : t("status.noImageSelected")
          }
          title={iconAssetId ? (iconAssetName ?? iconAssetId) : t("status.noIconSelected")}
        />
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={ImagePlus}
          title={t("tooltip.openIconPicker")}
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
          disabled={!iconAssetId}
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
        {iconAssetId ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={XCircle}
            title={t("tooltip.clearSelectedIcon")}
            onClick={() => {
              setValue("iconAssetId", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconAssetName", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconOffsetX", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconOffsetY", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconScale", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconRotation", undefined, { shouldDirty: true, shouldTouch: true });
            }}
          >
            <span className="visually-hidden">{t("actions.clear")}</span>
          </IconButton>
        ) : null}
      </div>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
      {isAdjustmentsOpen && iconAssetId && isClient
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
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(iconOffsetX * 100)}
                      title={t("tooltip.adjustHorizontal")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconOffsetX", clamp(next / 100, 0, 1), {
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
                        setValue("iconOffsetX", clamp(iconOffsetX - 0.01, 0, 1), {
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
                        setValue("iconOffsetX", clamp(iconOffsetX + 0.01, 0, 1), {
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
                        setValue("iconOffsetX", 0, {
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
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(iconOffsetY * 100)}
                      title={t("tooltip.adjustVertical")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconOffsetY", clamp(next / 100, 0, 1), {
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
                        setValue("iconOffsetY", clamp(iconOffsetY + 0.01, 0, 1), {
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
                        setValue("iconOffsetY", clamp(iconOffsetY - 0.01, 0, 1), {
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
                        setValue("iconOffsetY", 0, {
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
                      value={iconScale}
                      title={t("tooltip.adjustScale")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconScale", clamp(next, MIN_SCALE, MAX_SCALE), {
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
                        const next = clamp(iconScale - SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("iconScale", next, {
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
                        const next = clamp(iconScale + SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("iconScale", next, {
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
                        setValue("iconScale", 1, {
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
                      value={iconRotation}
                      title={t("tooltip.adjustRotation")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconRotation", next, {
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
                        const next = clamp(iconRotation - ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("iconRotation", next, {
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
                        const next = clamp(iconRotation + ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("iconRotation", next, {
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
                        setValue("iconRotation", 0, {
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
        onSelect={(asset) => {
          setValue("iconAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
          setValue("iconAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
        }}
      />
    </div>
  );
}
