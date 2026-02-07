"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Plus, X } from "lucide-react";

import { DEFAULT_BORDER_COLOR } from "@/components/CardParts/CardBorder";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import { getBorderSwatches, setBorderSwatches } from "@/lib/settings-db";
import type { TemplateId } from "@/types/templates";

import styles from "./BorderColorField.module.css";

const MAX_SWATCHES = 10;

type BorderColorFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BorderColorField({ label, templateId }: BorderColorFieldProps) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext();
  const {
    state: { cardDrafts, isDirtyByTemplate },
    setCardDraft,
  } = useCardEditor();
  const [swatches, setSwatches] = useState<string[]>([]);

  const { field } = useController({ name: "borderColor", control });
  const borderColor = typeof field.value === "string" ? field.value : "";
  const colorValue = borderColor.trim() ? borderColor : DEFAULT_BORDER_COLOR;
  const normalizedCurrent = useMemo(() => normalizeHex(colorValue) ?? DEFAULT_BORDER_COLOR, [
    colorValue,
  ]);
  const swatchKeys = useMemo(
    () => new Set(swatches.map((swatch) => swatch.toUpperCase())),
    [swatches],
  );
  const savedColorRef = useRef<string | undefined>(undefined);
  const draftColor = (cardDrafts[templateId] as { borderColor?: string } | undefined)?.borderColor;
  const savedSwatches = useMemo(
    () =>
      swatches.filter(
        (swatch) => swatch.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase(),
      ),
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
    const saved = normalizeHex(savedColorRef.current);
    const nextColor = (saved ? saved : DEFAULT_BORDER_COLOR).toUpperCase();
    setValue("borderColor", nextColor, { shouldDirty: true, shouldTouch: true });

    const currentDraft = (cardDrafts[templateId] as { borderColor?: string } | undefined) ?? {};
    setCardDraft(templateId, { ...currentDraft, borderColor: nextColor } as never);
  };

  return (
    <div className="mb-2">
      <label className="form-label">
        {label}
      </label>
      <div className={styles.layout}>
        <div className={styles.picker}>
          <HexColorPicker
            color={normalizedCurrent}
            onChange={(value) => field.onChange(value)}
            className={styles.colorful}
          />
          <HexColorInput
            className={styles.hexInput}
            color={normalizedCurrent}
            onChange={(value) => field.onChange(value)}
            prefixed
          />
        </div>
        <div className={styles.swatches}>
          <div className={styles.swatchRow}>
        <SwatchButton
          color={DEFAULT_BORDER_COLOR}
          label={`${t("actions.select")} ${DEFAULT_BORDER_COLOR}`}
          title={t("form.heroquestDefaultBrown")}
          onClick={() => field.onChange(undefined)}
        />
            <SwatchActionButton
              label={t("actions.cancel")}
              title={t("actions.cancel")}
              disabled={!hasRevert(normalizedCurrent, savedColorRef.current)}
              onClick={handleRevert}
            >
              ↺
            </SwatchActionButton>
        {savedSwatches.slice(0, MAX_SWATCHES).map((swatch) => (
          <SwatchWithRemove
            key={swatch}
            color={swatch}
            onSelect={() => field.onChange(swatch)}
            onRemove={() => handleRemoveSwatch(swatch)}
            ariaLabel={`${t("actions.select")} ${swatch}`}
            removeLabel={`${t("actions.delete")} ${swatch}`}
          />
        ))}
        <SwatchActionButton
          label={t("form.saveSwatch")}
          title={t("form.saveSwatch")}
          disabled={
            normalizedCurrent.toUpperCase() === DEFAULT_BORDER_COLOR.toUpperCase() ||
            swatchKeys.has(normalizedCurrent.toUpperCase())
          }
          onClick={handleSaveSwatch}
        >
          <Plus aria-hidden size={14} />
        </SwatchActionButton>
          </div>
        </div>
      </div>
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

function hasRevert(current: string, saved: string | undefined) {
  const normalizedCurrent = normalizeHex(current) ?? DEFAULT_BORDER_COLOR;
  const normalizedSaved = normalizeHex(saved) ?? DEFAULT_BORDER_COLOR;
  return normalizedCurrent.toUpperCase() !== normalizedSaved.toUpperCase();
}

type SwatchButtonProps = {
  color: string;
  label: string;
  title?: string;
  onClick: () => void;
};

function SwatchButton({ color, label, title, onClick }: SwatchButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={styles.swatchButton}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
}

type SwatchActionButtonProps = {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function SwatchActionButton({
  label,
  title,
  disabled,
  onClick,
  children,
}: SwatchActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      className={styles.swatchAction}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type SwatchWithRemoveProps = {
  color: string;
  onSelect: () => void;
  onRemove: () => void;
  ariaLabel: string;
  removeLabel: string;
};

function SwatchWithRemove({
  color,
  onSelect,
  onRemove,
  ariaLabel,
  removeLabel,
}: SwatchWithRemoveProps) {
  return (
    <div className={styles.swatchShell}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={color}
        className={styles.swatchButton}
        style={{ backgroundColor: color }}
        onClick={onSelect}
      />
      <button
        type="button"
        aria-label={removeLabel}
        className={styles.swatchRemove}
        onClick={onRemove}
      >
        <X aria-hidden size={10} />
      </button>
    </div>
  );
}
