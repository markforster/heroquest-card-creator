"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import { DEFAULT_BORDER_COLOR } from "@/components/Cards/CardParts/CardBorder";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { getBorderSwatches, setBorderSwatches } from "@/lib/settings-db";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import type { TemplateId } from "@/types/templates";

const MAX_SWATCHES = 10;
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
  const [swatches, setSwatches] = useState<string[]>([]);
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: SMART_CANVAS_WIDTH,
    height: SMART_CANVAS_HEIGHT,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { field } = useController({ name: "borderColor", control });
  const borderColor = typeof field.value === "string" ? field.value : "";
  const isTransparent = isTransparentColor(borderColor);
  const colorValue = borderColor.trim() && !isTransparent ? borderColor : DEFAULT_BORDER_COLOR;
  const normalizedCurrent = useMemo(
    () => normalizeHex(colorValue) ?? DEFAULT_BORDER_COLOR,
    [colorValue],
  );
  const normalizedSelected = useMemo(() => normalizeBorderColor(borderColor), [borderColor]);
  const swatchKeys = useMemo(
    () => new Set(swatches.map((swatch) => swatch.toUpperCase())),
    [swatches],
  );
  const savedColorRef = useRef<string | undefined>(undefined);
  const draftColor =
    draftTemplateId === templateId && draft
      ? (draft as { borderColor?: string } | undefined)?.borderColor
      : undefined;
  const savedSwatches = useMemo(
    () =>
      swatches.filter((swatch) => {
        if (isTransparentColor(swatch)) return false;
        return swatch.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase();
      }),
    [swatches],
  );
  useEffect(() => {
    let active = true;
    getBorderSwatches()
      .then((values) => {
        if (!active) return;
        setSwatches(values);
      })
      .catch(() => {
        if (!active) return;
        setSwatches([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirtyByTemplate[templateId]) {
      savedColorRef.current = draftColor?.trim() ? draftColor.trim() : undefined;
    }
  }, [draftColor, isDirtyByTemplate, templateId]);

  const handleSaveSwatch = async () => {
    const normalized = normalizedCurrent.toUpperCase();
    if (normalized === DEFAULT_BORDER_COLOR.toUpperCase()) return;
    if (swatchKeys.has(normalized)) return;
    const capped = swatches.filter(
      (swatch) => swatch.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase(),
    );
    const next = [...capped, normalized].slice(-MAX_SWATCHES);
    setSwatches(next);
    try {
      await setBorderSwatches(next);
    } catch {
      // Ignore persistence errors; UI still reflects latest swatches.
    }
  };

  const handleRemoveSwatch = async (color: string) => {
    const normalized = color.toUpperCase();
    const next = swatches.filter((swatch) => swatch.toUpperCase() !== normalized);
    setSwatches(next);
    try {
      await setBorderSwatches(next);
    } catch {
      // Ignore persistence errors; UI still reflects latest swatches.
    }
  };

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

  const handleTogglePopover = () => {
    setIsPopoverOpen((prev) => {
      return !prev;
    });
  };

  return (
    <div className="mb-2">
      <ColorPickerField
        label={label}
        inputValue={normalizedCurrent}
        selectedValue={normalizedSelected}
        defaultColor={DEFAULT_BORDER_COLOR}
        transparentValue={TRANSPARENT_BORDER_COLOR}
        swatches={savedSwatches.slice(0, MAX_SWATCHES)}
        smartGroups={smartGroups}
        isSmartBusy={isSmartBusy}
        onRequestSmart={handleRequestSmart}
        onChange={(value) => field.onChange(value)}
        onSelectDefault={handleSelectDefault}
        onSelectTransparent={() => field.onChange(TRANSPARENT_BORDER_COLOR)}
        onSaveSwatch={handleSaveSwatch}
        onRemoveSwatch={handleRemoveSwatch}
        canSaveSwatch={
          normalizedCurrent.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase() &&
          !swatchKeys.has(normalizedCurrent.toUpperCase())
        }
        canRevert={hasRevert(borderColor, savedColorRef.current)}
        onRevert={handleRevert}
        isOpen={isPopoverOpen}
        onToggleOpen={handleTogglePopover}
        onClose={() => {
          setIsPopoverOpen(false);
        }}
        popoverAlign="auto"
        popoverVAlign="center"
      />
    </div>
  );
}

function normalizeHex(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const short = trimmed.slice(1);
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toUpperCase();
  }

  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const short = trimmed;
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toUpperCase();
  }

  return null;
}

function isTransparentColor(value?: string) {
  return value?.trim().toLowerCase() === TRANSPARENT_BORDER_COLOR;
}

function normalizeBorderColor(value?: string) {
  if (isTransparentColor(value)) return TRANSPARENT_BORDER_COLOR;
  return normalizeHex(value) ?? DEFAULT_BORDER_COLOR;
}

function hasRevert(current: string, saved: string | undefined) {
  const normalizedCurrent = normalizeBorderColor(current);
  const normalizedSaved = normalizeBorderColor(saved);
  return normalizedCurrent !== normalizedSaved;
}
