"use client";

import { Droplet } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import {
  hasInspectorColorRevert,
  normalizeHexValue,
  normalizeInspectorColor,
} from "@/components/Cards/CardInspector/card-inspector-color-utils";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { usePopupState } from "@/hooks/usePopupState";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { useI18n } from "@/i18n/I18nProvider";
import {
  BACKGROUND_TINT_BLEND_MODES,
  DEFAULT_BACKGROUND_TINT_BLEND_MODE,
  normalizeBackgroundTintBlendModeForStorage,
  type BackgroundTintBlendMode,
} from "@/types/background-tint";
import type { TemplateId } from "@/types/templates";

const TRANSPARENT_TINT = "transparent";
const DEFAULT_TINT_COLOR = "#FFFFFF";
const SMART_CANVAS_WIDTH = 300;
const SMART_CANVAS_HEIGHT = 420;
const TINT_COLOR_OPTIONS = {
  defaultColor: DEFAULT_TINT_COLOR,
  transparentValue: TRANSPARENT_TINT,
} as const;

type BackgroundTintFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BackgroundTintField({ label, templateId }: BackgroundTintFieldProps) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext();
  const { savedValues } = useEditorForm();
  const { renderPreviewCanvas } = usePreviewCanvas();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: SMART_CANVAS_WIDTH,
    height: SMART_CANVAS_HEIGHT,
  });
  const popoverState = usePopupState();

  const { field } = useController({ name: "backgroundTint", control });
  const { field: blendModeField } = useController({ name: "backgroundTintBlendMode", control });
  const tintValue = typeof field.value === "string" ? field.value : "";
  const blendModeValue =
    typeof blendModeField.value === "string"
      ? (blendModeField.value as BackgroundTintBlendMode)
      : DEFAULT_BACKGROUND_TINT_BLEND_MODE;
  const normalizedSelected = useMemo(
    () => normalizeInspectorColor(tintValue, TINT_COLOR_OPTIONS),
    [tintValue],
  );
  const inputValue =
    normalizedSelected === TRANSPARENT_TINT ? "" : normalizeHexValue(normalizedSelected);
  const savedColorRef = useRef<string | undefined>(undefined);
  const blendModeLabel = t("form.backgroundTintBlendMode");

  useEffect(() => {
    const saved = savedValues as { backgroundTint?: string } | null;
    savedColorRef.current = saved?.backgroundTint?.trim() ? saved.backgroundTint.trim() : undefined;
  }, [savedValues, templateId]);

  const handleRevert = () => {
    const saved = normalizeInspectorColor(savedColorRef.current, TINT_COLOR_OPTIONS);
    const nextColor = saved === TRANSPARENT_TINT ? TRANSPARENT_TINT : saved.toUpperCase();
    setValue("backgroundTint", nextColor, { shouldDirty: true, shouldTouch: true });
  };

  const handleSelectDefault = () => {
    setValue("backgroundTint", undefined, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div>
      <div className={layoutStyles.inspectorFieldHeader}>
        <FormLabelWithIcon label={label} icon={Droplet} className="form-label" />
      </div>
      <ColorPickerField
        label={label}
        showLabel={false}
        inputValue={inputValue ?? DEFAULT_TINT_COLOR}
        selectedValue={normalizedSelected}
        defaultColor={DEFAULT_TINT_COLOR}
        transparentValue={TRANSPARENT_TINT}
        smartGroups={smartGroups}
        isSmartBusy={isSmartBusy}
        onRequestSmart={requestSmart}
        onChange={(value) => field.onChange(value)}
        onSelectDefault={handleSelectDefault}
        onSelectTransparent={() => field.onChange(TRANSPARENT_TINT)}
        canRevert={hasInspectorColorRevert(tintValue, savedColorRef.current, TINT_COLOR_OPTIONS)}
        onRevert={handleRevert}
        isOpen={popoverState.isOpen}
        onToggleOpen={popoverState.toggle}
        onClose={popoverState.close}
        popoverAlign="auto"
        popoverVAlign="center"
        popoverExtraControls={
          <label className={layoutStyles.backgroundTintBlendModeField}>
            <span>{blendModeLabel}</span>
            <select
              value={blendModeValue}
              aria-label={blendModeLabel}
              onChange={(event) => {
                blendModeField.onChange(
                  normalizeBackgroundTintBlendModeForStorage(
                    event.target.value as BackgroundTintBlendMode,
                  ),
                );
              }}
            >
              {BACKGROUND_TINT_BLEND_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {formatBlendModeLabel(mode)}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
}

function formatBlendModeLabel(mode: BackgroundTintBlendMode) {
  return mode
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
