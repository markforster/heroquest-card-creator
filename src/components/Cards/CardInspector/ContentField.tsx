"use client";

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
import { useI18n } from "@/i18n/I18nProvider";
import type { BodyTextStyle } from "@/types/card-data";

import ColorPickerPopover from "./ColorPickerPopover";

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
  const borderColor = useWatch({ name: "borderColor" }) as string | undefined;
  const fieldError = (errors as Record<string, { message?: string }>).description;

  const effectiveBackdrop = {
    ...DEFAULT_BODY_TEXT_STYLE.backdrop,
    ...(bodyTextStyle?.backdrop ?? {}),
  };
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

  const borderHidden =
    !borderColor ||
    borderColor.trim() === "" ||
    borderColor.toLowerCase() === "transparent" ||
    borderColor.toLowerCase() === "none" ||
    borderColor.replace(/\s+/g, "").toLowerCase() === "rgba(0,0,0,0)";
  const cornerToggleDisabled = effectiveBackdrop.fitMode === "fit-to-text";

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <label htmlFor="description" className="form-label mb-0 flex-grow-1">
          {label}
        </label>
        {showToolbar ? (
          <div className={layoutStyles.bodyTextToolbar}>
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
            <ColorPickerPopover
              color={effectiveBackdrop.color ?? "#ffffff"}
              onColorChange={(value) => updateBackdrop({ color: value })}
              opacity={effectiveBackdrop.opacity ?? 0.55}
              onOpacityChange={(value) => updateBackdrop({ opacity: value })}
              showOpacity
              disabled={!textEnabled}
              title={t("tooltip.bodyTextColor")}
              labelColor={t("label.color")}
              labelOpacity={t("label.opacity")}
              buttonClassName={layoutStyles.bodyTextToolbarButton}
              buttonActiveClassName={layoutStyles.bodyTextToolbarButtonActive}
              buttonDisabledClassName={layoutStyles.bodyTextToolbarButtonDisabled}
              popoverClassName={layoutStyles.bodyTextToolbarPopover}
              rowClassName={layoutStyles.bodyTextToolbarRow}
            />
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
              } ${cornerToggleDisabled || !textEnabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
              title={t("tooltip.bodyTextCorners")}
              disabled={cornerToggleDisabled || !textEnabled}
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
