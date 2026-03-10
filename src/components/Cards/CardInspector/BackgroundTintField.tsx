"use client";

import { Droplet } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { usePopupState } from "@/hooks/usePopupState";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { formatHexColor, isTransparentHex, parseHexColor } from "@/lib/color";
import type { TemplateId } from "@/types/templates";

const TRANSPARENT_TINT = "transparent";
const DEFAULT_TINT_COLOR = "#FFFFFF";
const SMART_CANVAS_WIDTH = 300;
const SMART_CANVAS_HEIGHT = 420;

type BackgroundTintFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BackgroundTintField({ label, templateId }: BackgroundTintFieldProps) {
  const { control, setValue } = useFormContext();
  const {
    state: { draftTemplateId, draft, isDirtyByTemplate },
    setCardDraft,
  } = useCardEditor();
  const { renderPreviewCanvas } = usePreviewCanvas();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: SMART_CANVAS_WIDTH,
    height: SMART_CANVAS_HEIGHT,
  });
  const popoverState = usePopupState();

  const { field } = useController({ name: "backgroundTint", control });
  const tintValue = typeof field.value === "string" ? field.value : "";
  const normalizedSelected = useMemo(() => normalizeTintColor(tintValue), [tintValue]);
  const inputValue =
    normalizedSelected === TRANSPARENT_TINT ? "" : normalizeHexValue(normalizedSelected);
  const savedColorRef = useRef<string | undefined>(undefined);
  const draftTint =
    draftTemplateId === templateId && draft
      ? (draft as { backgroundTint?: string } | undefined)?.backgroundTint
      : undefined;

  useEffect(() => {
    if (!isDirtyByTemplate[templateId]) {
      savedColorRef.current = draftTint?.trim() ? draftTint.trim() : undefined;
    }
  }, [draftTint, isDirtyByTemplate, templateId]);

  const handleRevert = () => {
    const saved = normalizeTintColor(savedColorRef.current);
    const nextColor = saved === TRANSPARENT_TINT ? TRANSPARENT_TINT : saved.toUpperCase();
    setValue("backgroundTint", nextColor, { shouldDirty: true, shouldTouch: true });

    const currentDraft =
      draftTemplateId === templateId && draft ? (draft as { backgroundTint?: string }) : {};
    setCardDraft(templateId, { ...currentDraft, backgroundTint: nextColor } as never);
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
        canRevert={hasRevert(tintValue, savedColorRef.current)}
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
  if (value.trim().toLowerCase() === TRANSPARENT_TINT) return true;
  return isTransparentHex(value);
}

function normalizeTintColor(value?: string) {
  if (isTransparentColor(value)) return TRANSPARENT_TINT;
  return normalizeHexValue(value) ?? DEFAULT_TINT_COLOR;
}

function hasRevert(current: string, saved: string | undefined) {
  const normalizedCurrent = normalizeTintColor(current);
  const normalizedSaved = normalizeTintColor(saved);
  return normalizedCurrent !== normalizedSaved;
}
