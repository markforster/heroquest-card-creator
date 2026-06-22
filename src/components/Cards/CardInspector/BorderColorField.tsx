"use client";

import { Palette } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import {
  hasInspectorColorRevert,
  normalizeHexValue,
  normalizeInspectorColor,
} from "@/components/Cards/CardInspector/card-inspector-color-utils";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import { DEFAULT_BORDER_COLOR } from "@/components/Cards/CardParts/CardBorder";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { usePopupState } from "@/hooks/usePopupState";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import type { TemplateId } from "@/types/templates";

const SMART_CANVAS_WIDTH = 300;
const SMART_CANVAS_HEIGHT = 420;
const TRANSPARENT_BORDER_COLOR = "transparent";
const BORDER_COLOR_OPTIONS = {
  defaultColor: DEFAULT_BORDER_COLOR,
  transparentValue: TRANSPARENT_BORDER_COLOR,
} as const;

type BorderColorFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BorderColorField({ label, templateId }: BorderColorFieldProps) {
  const { control, setValue } = useFormContext();
  const { renderPreviewCanvas } = usePreviewCanvas();
  const { savedValues } = useEditorForm();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: SMART_CANVAS_WIDTH,
    height: SMART_CANVAS_HEIGHT,
  });
  const popoverState = usePopupState();

  const { field } = useController({ name: "borderColor", control });
  const borderColor = typeof field.value === "string" ? field.value : "";
  const normalizedSelected = useMemo(
    () => normalizeInspectorColor(borderColor, BORDER_COLOR_OPTIONS),
    [borderColor],
  );
  const inputValue =
    normalizedSelected === TRANSPARENT_BORDER_COLOR
      ? ""
      : (normalizeHexValue(normalizedSelected) ?? DEFAULT_BORDER_COLOR);
  const savedColorRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const saved = savedValues as { borderColor?: string } | null;
    savedColorRef.current = saved?.borderColor?.trim() ? saved.borderColor.trim() : undefined;
  }, [savedValues, templateId]);

  const handleRevert = () => {
    const saved = normalizeInspectorColor(savedColorRef.current, BORDER_COLOR_OPTIONS);
    const nextColor =
      saved === TRANSPARENT_BORDER_COLOR ? TRANSPARENT_BORDER_COLOR : saved.toUpperCase();
    setValue("borderColor", nextColor, { shouldDirty: true, shouldTouch: true });
  };

  const handleSelectDefault = () => {
    setValue("borderColor", undefined, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div className="mb-2">
      <div className={layoutStyles.inspectorFieldHeader}>
        <FormLabelWithIcon label={label} icon={Palette} className="form-label" />
      </div>
      <ColorPickerField
        label={label}
        showLabel={false}
        inputValue={inputValue}
        selectedValue={normalizedSelected}
        defaultColor={DEFAULT_BORDER_COLOR}
        transparentValue={TRANSPARENT_BORDER_COLOR}
        smartGroups={smartGroups}
        isSmartBusy={isSmartBusy}
        onRequestSmart={requestSmart}
        onChange={(value) => field.onChange(value)}
        onSelectDefault={handleSelectDefault}
        onSelectTransparent={() => field.onChange(TRANSPARENT_BORDER_COLOR)}
        canRevert={hasInspectorColorRevert(borderColor, savedColorRef.current, BORDER_COLOR_OPTIONS)}
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
