"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  Expand,
  Eye,
  EyeOff,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Square,
  SquareRoundCorner,
  Shrink,
} from "lucide-react";

import layoutStyles from "@/app/page.module.css";
import ColorPickerField from "@/components/common/ColorPickerField";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { useI18n } from "@/i18n/I18nProvider";
import type { BodyTextStyle } from "@/types/card-data";

type ContentFieldProps = {
  label: string;
  showToolbar?: boolean;
  showToggle?: boolean;
};

const DEFAULT_BODY_TEXT_STYLE: BodyTextStyle = {
  enabled: false,
  backdrop: {
    enabled: true,
    color: "#ffffff",
    opacity: 0.55,
    insetMode: "matchBorder",
    cornerMode: "opposite-title",
    fitMode: "full",
  },
};

export default function ContentField({
  label,
  showToolbar = false,
  showToggle = false,
}: ContentFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext();
  const bodyTextStyle = useWatch({ name: "bodyTextStyle" }) as BodyTextStyle | undefined;
  const fieldError = (errors as Record<string, { message?: string }>).description;
  const [isBodyColorOpen, setIsBodyColorOpen] = useState(false);
  const { renderPreviewCanvas } = usePreviewCanvas();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: 300,
    height: 420,
  });

  const effectiveBackdrop = {
    ...DEFAULT_BODY_TEXT_STYLE.backdrop,
    ...(bodyTextStyle?.backdrop ?? {}),
  };
  const defaultBackdropColor = DEFAULT_BODY_TEXT_STYLE.backdrop.color ?? "#ffffff";
  const defaultBackdropHex = toHex8(
    defaultBackdropColor,
    DEFAULT_BODY_TEXT_STYLE.backdrop?.opacity ?? 1,
  );
  const currentBackdropHex = toHex8(
    effectiveBackdrop.color ?? defaultBackdropColor,
    effectiveBackdrop.opacity,
  );
  const textEnabled = showToggle ? (bodyTextStyle?.enabled ?? false) : true;

  const updateBackdrop = (partial: Partial<NonNullable<BodyTextStyle["backdrop"]>>) => {
    const next: BodyTextStyle = {
      ...(bodyTextStyle ?? {}),
      backdrop: {
        ...effectiveBackdrop,
        ...partial,
      },
    };
    setValue("bodyTextStyle", next, { shouldDirty: true, shouldTouch: true });
  };

  const updateBackdropColor = (value: string) => {
    updateBackdrop({ color: value, opacity: undefined });
  };

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <label htmlFor="description" className="form-label mb-0 flex-grow-1">
          {label}
        </label>
        {showToolbar ? (
          <div
            className={`${layoutStyles.bodyTextToolbar} d-inline-flex align-items-center gap-1`}
          >
            <button
              type="button"
              className={`${layoutStyles.bodyTextToolbarButton} ${
                effectiveBackdrop.enabled ? layoutStyles.bodyTextToolbarButtonActive : ""
              } ${!textEnabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
              title={t("tooltip.bodyTextBackdrop")}
              disabled={!textEnabled}
              onClick={() => updateBackdrop({ enabled: !effectiveBackdrop.enabled })}
            >
              {effectiveBackdrop.enabled ? (
                <Eye size={14} aria-hidden="true" />
              ) : (
                <EyeOff size={14} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={`${layoutStyles.bodyTextToolbarButton} ${
                effectiveBackdrop.insetMode === "matchBorder"
                  ? layoutStyles.bodyTextToolbarButtonActive
                  : ""
              } ${!textEnabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
              title={t("tooltip.bodyTextInset")}
              disabled={!textEnabled}
              onClick={() =>
                updateBackdrop({
                  insetMode: effectiveBackdrop.insetMode === "matchBorder" ? "flush" : "matchBorder",
                })
              }
            >
              {effectiveBackdrop.insetMode === "matchBorder" ? (
                <Shrink size={14} aria-hidden="true" />
              ) : (
                <Expand size={14} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={`${layoutStyles.bodyTextToolbarButton} ${
                effectiveBackdrop.cornerMode === "all"
                  ? layoutStyles.bodyTextToolbarButtonActive
                  : ""
              } ${!textEnabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
              title={t("tooltip.bodyTextCorners")}
              disabled={!textEnabled}
              onClick={() =>
                updateBackdrop({
                  cornerMode:
                    effectiveBackdrop.cornerMode === "all" ? "opposite-title" : "all",
                })
              }
            >
              {effectiveBackdrop.cornerMode === "all" ? (
                <SquareRoundCorner size={14} aria-hidden="true" />
              ) : (
                <Square size={14} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={`${layoutStyles.bodyTextToolbarButton} ${
                effectiveBackdrop.fitMode === "fit-to-text"
                  ? layoutStyles.bodyTextToolbarButtonActive
                  : ""
              } ${!textEnabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
              title={t("tooltip.bodyTextFit")}
              disabled={!textEnabled}
              onClick={() =>
                updateBackdrop({
                  fitMode: effectiveBackdrop.fitMode === "fit-to-text" ? "full" : "fit-to-text",
                })
              }
            >
              {effectiveBackdrop.fitMode === "fit-to-text" ? (
                <ListChevronsDownUp size={14} aria-hidden="true" />
              ) : (
                <ListChevronsUpDown size={14} aria-hidden="true" />
              )}
            </button>
            {showToggle ? (
              <div className="form-check form-switch m-0 ms-2">
                <input
                  id="bodyTextEnabled"
                  type="checkbox"
                  className="form-check-input hq-toggle"
                  title={t("tooltip.bodyTextVisibility")}
                  aria-label={t("tooltip.bodyTextVisibility")}
                  role="switch"
                  checked={textEnabled}
                  onChange={() =>
                    setValue(
                      "bodyTextStyle",
                      { ...(bodyTextStyle ?? {}), enabled: !textEnabled },
                      { shouldDirty: true, shouldTouch: true },
                    )
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {textEnabled ? (
        <>
          <div className="d-flex align-items-start gap-2">
            <div style={{ flex: "1 0 auto", minWidth: 0 }}>
              <textarea
                id="description"
                className="form-control form-control-sm"
                rows={6}
                style={{ backgroundColor: "#333", color: "#f5f5f5" }}
                title={t("tooltip.rulesAndFlavour")}
                {...register("description", {
                  maxLength: {
                    value: 2000,
                    message: t("errors.contentMaxLength"),
                  },
                })}
              />
            </div>
            <div style={{ flex: "0 1 auto" }}>
              <ColorPickerField
                label={t("label.color")}
                showLabel={false}
                showInput={false}
                inputValue={currentBackdropHex}
                selectedValue={currentBackdropHex}
                defaultColor={defaultBackdropHex}
                smartGroups={smartGroups}
                isSmartBusy={isSmartBusy}
                onRequestSmart={requestSmart}
                onChange={updateBackdropColor}
                onSelectDefault={() => updateBackdropColor(defaultBackdropHex)}
                onSelectTransparent={() => updateBackdropColor("#00000000")}
                canRevert={currentBackdropHex.toLowerCase() !== defaultBackdropHex.toLowerCase()}
                onRevert={() => updateBackdropColor(defaultBackdropHex)}
                isOpen={isBodyColorOpen}
                onToggleOpen={() => setIsBodyColorOpen((prev) => !prev)}
                onClose={() => setIsBodyColorOpen(false)}
                popoverAlign="auto"
                popoverVAlign="center"
                isDisabled={!textEnabled}
              />
            </div>
          </div>
          {fieldError ? (
            <div className="form-text text-danger">
              {String(fieldError.message ?? t("errors.invalidValue"))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function toHex8(color: string, opacity?: number) {
  const resolved = normalizeHex(color);
  const baseHex = resolved?.hex ?? "#FFFFFF";
  const alpha =
    typeof opacity === "number"
      ? opacity
      : typeof resolved?.alpha === "number"
        ? resolved.alpha
        : 1;
  return `${baseHex}${alphaToHex(alpha)}`;
}

function normalizeHex(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "transparent") {
    return { hex: "#000000", alpha: 0 };
  }

  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null;

  if (raw.length === 3 || raw.length === 4) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    const a = raw.length === 4 ? raw[3] : "f";
    return {
      hex: `#${r}${r}${g}${g}${b}${b}`.toUpperCase(),
      alpha: parseInt(`${a}${a}`, 16) / 255,
    };
  }

  if (raw.length === 6 || raw.length === 8) {
    return {
      hex: `#${raw.slice(0, 6)}`.toUpperCase(),
      alpha: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
    };
  }

  return null;
}

function alphaToHex(alpha: number) {
  const clamped = Math.min(Math.max(alpha, 0), 1);
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}
