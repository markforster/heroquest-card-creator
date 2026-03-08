"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  BadgeHelp,
  TextCursorInput,
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
import { parseHexColor } from "@/lib/color";
import type { BodyTextStyle } from "@/types/card-data";
import ModalShell from "@/components/common/ModalShell";
import FormattingHelpContent from "@/components/Cards/CardInspector/FormattingHelpContent";

import BaseInspectorField from "./BaseInspectorField";

type ContentFieldProps = {
  label: string;
  showToolbar?: boolean;
  showToggle?: boolean;
  showFormattingHelp?: boolean;
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
  showFormattingHelp = false,
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const defaultBackdrop = DEFAULT_BODY_TEXT_STYLE.backdrop ?? {};
  const effectiveBackdrop = {
    ...defaultBackdrop,
    ...(bodyTextStyle?.backdrop ?? {}),
  };
  const defaultBackdropColor = defaultBackdrop.color ?? "#ffffff";
  const defaultBackdropHex = toHex8(defaultBackdropColor, defaultBackdrop.opacity ?? 1);
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

  const toolbar = (
    <div className="d-inline-flex align-items-center gap-2 ms-auto">
      {showFormattingHelp ? (
        <button
          type="button"
          className={layoutStyles.helpIconButton}
          title={t("tooltip.formattingHelp")}
          aria-label={t("tooltip.formattingHelp")}
          onClick={() => setIsHelpOpen(true)}
        >
          <BadgeHelp className={layoutStyles.icon} aria-hidden="true" />
        </button>
      ) : null}
      {showToolbar ? (
        <div className={`${layoutStyles.bodyTextToolbar} d-inline-flex align-items-center gap-1`}>
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
                insetMode:
                  effectiveBackdrop.insetMode === "matchBorder" ? "flush" : "matchBorder",
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
                cornerMode: effectiveBackdrop.cornerMode === "all" ? "opposite-title" : "all",
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
  );

  const input = textEnabled ? (
    <>
      <div className="d-flex align-items-start gap-2">
        <div style={{ flex: "1 0 auto", minWidth: 0 }}>
          <textarea
            id="description"
            className={`form-control form-control-sm ${layoutStyles.cardTextArea}`}
            rows={6}
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
    </>
  ) : null;

  const footer = (
    <ModalShell
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
      title={t("heading.formattingHelp")}
    >
      <FormattingHelpContent />
    </ModalShell>
  );

  return (
    <BaseInspectorField
      id="description"
      label={label}
      icon={TextCursorInput}
      error={fieldError?.message ?? (fieldError ? t("errors.invalidValue") : null)}
      toolbar={toolbar}
      input={input ?? null}
      footer={footer}
    />
  );
}

function toHex8(color: string, opacity?: number) {
  const resolved = parseHexColor(color, { allowTransparent: true });
  const baseHex = resolved?.hex ?? "#FFFFFF";
  const alpha =
    typeof opacity === "number"
      ? opacity
      : typeof resolved?.alpha === "number"
        ? resolved.alpha
        : 1;
  return `${baseHex}${alphaToHex(alpha)}`;
}

function alphaToHex(alpha: number) {
  const clamped = Math.min(Math.max(alpha, 0), 1);
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}
