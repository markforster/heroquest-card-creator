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
  const tintValue = typeof field.value === "string" ? field.value : "";
  const normalizedSelected = useMemo(
    () => normalizeInspectorColor(tintValue, TINT_COLOR_OPTIONS),
    [tintValue],
  );
  const inputValue =
    normalizedSelected === TRANSPARENT_TINT ? "" : normalizeHexValue(normalizedSelected);
  const savedColorRef = useRef<string | undefined>(undefined);

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

  const handleRequestSmart = async () => {
    if (isSmartBusy) return;
    await requestSmart();
  };

  return (
    <div className="mb-2">
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
        onRequestSmart={handleRequestSmart}
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
      />
    </div>
  );
}
