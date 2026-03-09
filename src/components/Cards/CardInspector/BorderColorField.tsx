"use client";

import { Palette } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import { DEFAULT_BORDER_COLOR } from "@/components/Cards/CardParts/CardBorder";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { usePopupState } from "@/hooks/usePopupState";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { formatHexColor, isTransparentHex, parseHexColor } from "@/lib/color";
import type { TemplateId } from "@/types/templates";

const SMART_CANVAS_WIDTH = 300;
const SMART_CANVAS_HEIGHT = 420;
const TRANSPARENT_BORDER_COLOR = "transparent";

type BorderColorFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BorderColorField({ label, templateId }: BorderColorFieldProps) {
  const { control, setValue } = useFormContext();
  const { renderPreviewCanvas } = usePreviewCanvas();
  const {
    state: { draftTemplateId, draft, isDirtyByTemplate },
    setCardDraft,
  } = useCardEditor();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: SMART_CANVAS_WIDTH,
    height: SMART_CANVAS_HEIGHT,
  });
  const popoverState = usePopupState();

  const { field } = useController({ name: "borderColor", control });
  const borderColor = typeof field.value === "string" ? field.value : "";
  const normalizedSelected = useMemo(() => normalizeBorderColor(borderColor), [borderColor]);
  const inputValue =
    normalizedSelected === TRANSPARENT_BORDER_COLOR
      ? ""
      : (normalizeHexValue(normalizedSelected) ?? DEFAULT_BORDER_COLOR);
  const savedColorRef = useRef<string | undefined>(undefined);
  const draftColor =
    draftTemplateId === templateId && draft
      ? (draft as { borderColor?: string } | undefined)?.borderColor
      : undefined;
  useEffect(() => {
    if (!isDirtyByTemplate[templateId]) {
      savedColorRef.current = draftColor?.trim() ? draftColor.trim() : undefined;
    }
  }, [draftColor, isDirtyByTemplate, templateId]);

  const handleRevert = () => {
    const saved = normalizeBorderColor(savedColorRef.current);
    const nextColor =
      saved === TRANSPARENT_BORDER_COLOR ? TRANSPARENT_BORDER_COLOR : saved.toUpperCase();
    setValue("borderColor", nextColor, { shouldDirty: true, shouldTouch: true });

    const currentDraft =
      draftTemplateId === templateId && draft ? (draft as { borderColor?: string }) : {};
    setCardDraft(templateId, { ...currentDraft, borderColor: nextColor } as never);
  };

  const handleSelectDefault = () => {
    setValue("borderColor", undefined, { shouldDirty: true, shouldTouch: true });
  };

  const handleRequestSmart = async () => {
    if (isSmartBusy) return;
    await requestSmart();
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
        onRequestSmart={handleRequestSmart}
        onChange={(value) => field.onChange(value)}
        onSelectDefault={handleSelectDefault}
        onSelectTransparent={() => field.onChange(TRANSPARENT_BORDER_COLOR)}
        canRevert={hasRevert(borderColor, savedColorRef.current)}
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

function normalizeHexValue(value: string | undefined): string | null {
  const parsed = parseHexColor(value);
  if (!parsed) return null;
  return formatHexColor(parsed, { alphaMode: "preserve", case: "upper" });
}

function isTransparentColor(value?: string) {
  if (!value) return false;
  if (value.trim().toLowerCase() === TRANSPARENT_BORDER_COLOR) return true;
  return isTransparentHex(value);
}

function normalizeBorderColor(value?: string) {
  if (isTransparentColor(value)) return TRANSPARENT_BORDER_COLOR;
  return normalizeHexValue(value) ?? DEFAULT_BORDER_COLOR;
}

function hasRevert(current: string, saved: string | undefined) {
  const normalizedCurrent = normalizeBorderColor(current);
  const normalizedSaved = normalizeBorderColor(saved);
  return normalizedCurrent !== normalizedSaved;
}
