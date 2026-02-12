"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useController, useFormContext } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { usePreviewCanvas } from "@/components/CardPreview/PreviewCanvasContext";
import { DEFAULT_BORDER_COLOR } from "@/components/CardParts/CardBorder";
import { useI18n } from "@/i18n/I18nProvider";
import { getPaletteGroups } from "@/lib/palette";
import { getBorderSwatches, setBorderSwatches } from "@/lib/settings-db";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import type { TemplateId } from "@/types/templates";

import styles from "./BorderColorField.module.css";

const MAX_SWATCHES = 10;
const SMART_SWATCHES = 5;
const SMART_CANVAS_WIDTH = 300;
const SMART_CANVAS_HEIGHT = 420;
const TRANSPARENT_BORDER_COLOR = "transparent";

type BorderColorFieldProps = {
  label: string;
  templateId: TemplateId;
};

export default function BorderColorField({ label, templateId }: BorderColorFieldProps) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext();
  const { renderPreviewCanvas } = usePreviewCanvas();
  const {
    state: { cardDrafts, isDirtyByTemplate },
    setCardDraft,
  } = useCardEditor();
  const [swatches, setSwatches] = useState<string[]>([]);
  const [smartGroups, setSmartGroups] = useState<
    { id: "dominant" | "vibrant" | "muted" | "dark" | "light" | "complementary"; colors: string[] }[]
  >([]);
  const [isSmartOpen, setIsSmartOpen] = useState(false);
  const [isSmartBusy, setIsSmartBusy] = useState(false);
  const [smartPopoverStyle, setSmartPopoverStyle] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const smartRequestRef = useRef(0);
  const smartPopoverRef = useRef<HTMLDivElement | null>(null);
  const smartButtonRef = useRef<HTMLButtonElement | null>(null);

  const { field } = useController({ name: "borderColor", control });
  const borderColor = typeof field.value === "string" ? field.value : "";
  const isTransparent = isTransparentColor(borderColor);
  const colorValue =
    borderColor.trim() && !isTransparent ? borderColor : DEFAULT_BORDER_COLOR;
  const normalizedCurrent = useMemo(
    () => normalizeHex(colorValue) ?? DEFAULT_BORDER_COLOR,
    [colorValue],
  );
  const normalizedSelected = useMemo(
    () => normalizeBorderColor(borderColor),
    [borderColor],
  );
  const isDefaultSelected = useMemo(
    () =>
      !borderColor.trim() ||
      normalizeBorderColor(borderColor) === normalizeBorderColor(DEFAULT_BORDER_COLOR),
    [borderColor],
  );
  const swatchKeys = useMemo(
    () => new Set(swatches.map((swatch) => swatch.toUpperCase())),
    [swatches],
  );
  const savedColorRef = useRef<string | undefined>(undefined);
  const draftColor = (cardDrafts[templateId] as { borderColor?: string } | undefined)?.borderColor;
  const savedSwatches = useMemo(
    () =>
      swatches.filter((swatch) => {
        if (isTransparentColor(swatch)) return false;
        return swatch.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase();
      }),
    [swatches],
  );

  useOutsideClick([smartPopoverRef, smartButtonRef], () => setIsSmartOpen(false), isSmartOpen);

  useLayoutEffect(() => {
    if (!isSmartOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      const anchor = smartButtonRef.current;
      const popover = smartPopoverRef.current;
      if (!anchor || !popover) return;

      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const padding = 12;
      const preferredTop = anchorRect.bottom + 8;
      const preferredLeft = anchorRect.left;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = Math.min(
        Math.max(preferredLeft, padding),
        viewportWidth - popoverRect.width - padding,
      );

      let top = preferredTop;
      const wouldOverflowBottom = preferredTop + popoverRect.height + padding > viewportHeight;
      if (wouldOverflowBottom) {
        const aboveTop = anchorRect.top - popoverRect.height - 8;
        top = aboveTop;
      }
      top = Math.min(
        Math.max(top, padding),
        viewportHeight - popoverRect.height - padding,
      );

      setSmartPopoverStyle({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isSmartOpen, smartGroups, isSmartBusy]);

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

    const currentDraft = (cardDrafts[templateId] as { borderColor?: string } | undefined) ?? {};
    setCardDraft(templateId, { ...currentDraft, borderColor: nextColor } as never);
  };

  const handleSelectDefault = () => {
    setValue("borderColor", undefined, { shouldDirty: true, shouldTouch: true });
  };

  const handleGenerateSmartSwatches = async () => {
    const requestId = smartRequestRef.current + 1;
    smartRequestRef.current = requestId;
    setIsSmartBusy(true);

    try {
      const canvas = await renderPreviewCanvas({
        width: SMART_CANVAS_WIDTH,
        height: SMART_CANVAS_HEIGHT,
      });
      if (!canvas || smartRequestRef.current !== requestId) return;

      const palette = await getPaletteGroups(canvas, {
        width: SMART_CANVAS_WIDTH,
        height: SMART_CANVAS_HEIGHT,
      });
      if (smartRequestRef.current !== requestId) return;
      setSmartGroups(palette);
    } catch {
      if (smartRequestRef.current !== requestId) return;
      setSmartGroups([]);
    } finally {
      if (smartRequestRef.current === requestId) {
        setIsSmartBusy(false);
      }
    }
  };

  const handleToggleSmart = async () => {
    if (isSmartOpen) {
      setIsSmartOpen(false);
      return;
    }
    setIsSmartOpen(true);
    await handleGenerateSmartSwatches();
  };

  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
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
          <div className={styles.specialRow}>
            <SwatchButton
              color={DEFAULT_BORDER_COLOR}
              label={`${t("actions.select")} ${DEFAULT_BORDER_COLOR}`}
              title={t("form.heroquestDefaultBrown")}
              isSelected={isDefaultSelected}
              onClick={handleSelectDefault}
            />
            <SwatchActionButton
              label={t("actions.cancel")}
              title={t("actions.cancel")}
              disabled={!hasRevert(borderColor, savedColorRef.current)}
              onClick={handleRevert}
            >
              ↺
            </SwatchActionButton>
            <div className={styles.smartSwatchAnchor}>
              <SwatchActionButton
                label={t("form.smartSwatch")}
                title={t("form.smartSwatch")}
                onClick={handleToggleSmart}
                buttonRef={smartButtonRef}
                isActive={isSmartOpen}
              >
                <Sparkles aria-hidden size={14} />
              </SwatchActionButton>
              {isSmartOpen ? (
                <div
                  ref={smartPopoverRef}
                  className={styles.smartPopover}
                  role="menu"
                  style={
                    smartPopoverStyle
                      ? { left: smartPopoverStyle.left, top: smartPopoverStyle.top }
                      : undefined
                  }
                >
                  <div className={styles.smartPopoverHeader}>{t("form.smartSuggestions")}</div>
                  {isSmartBusy ? (
                    <div className={styles.smartPopoverHint}>{t("form.smartSwatchLoading")}</div>
                  ) : smartGroups.length > 0 ? (
                    <div className={styles.smartPopoverGroups}>
                      {smartGroups.map((group) => (
                        <div key={group.id} className={styles.smartPopoverGroup}>
                          <div className={styles.smartPopoverGroupLabel}>
                            {t(`form.smartGroup.${group.id}` as never)}
                          </div>
                          <div className={styles.smartPopoverGrid}>
                            {group.colors.slice(0, SMART_SWATCHES).map((color) => (
                              <button
                                key={`${group.id}-${color}`}
                                type="button"
                                className={styles.smartPopoverSwatch}
                                style={{ backgroundColor: color }}
                                title={color}
                                aria-label={`${t("actions.select")} ${color}`}
                                onClick={() => {
                                  field.onChange(color);
                                  setIsSmartOpen(false);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.smartPopoverHint}>{t("form.smartSwatchEmpty")}</div>
                  )}
                </div>
              ) : null}
            </div>
            <SwatchButton
              color={TRANSPARENT_BORDER_COLOR}
              label={`${t("actions.select")} ${t("form.noBorder")}`}
              title={t("form.noBorder")}
              className={styles.noBorderSwatch}
              isSelected={normalizedSelected === TRANSPARENT_BORDER_COLOR}
              onClick={() => field.onChange(TRANSPARENT_BORDER_COLOR)}
            />
          </div>
          <div className={styles.swatchGrid}>
            {savedSwatches.slice(0, MAX_SWATCHES).map((swatch) => (
              <SwatchWithRemove
                key={swatch}
                color={swatch}
                isSelected={normalizeBorderColor(swatch) === normalizedSelected}
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

type SwatchButtonProps = {
  color: string;
  label: string;
  title?: string;
  onClick: () => void;
  className?: string;
  isSelected?: boolean;
};

function SwatchButton({
  color,
  label,
  title,
  onClick,
  className,
  isSelected,
}: SwatchButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={`${styles.swatchButton} ${isSelected ? styles.swatchSelected : ""} ${
        className ?? ""
      }`}
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
  buttonRef?: RefObject<HTMLButtonElement>;
  isActive?: boolean;
  children: ReactNode;
};

function SwatchActionButton({
  label,
  title,
  disabled,
  onClick,
  buttonRef,
  isActive,
  children,
}: SwatchActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      className={`${styles.swatchAction} ${isActive ? styles.swatchActionActive : ""}`}
      disabled={disabled}
      onClick={onClick}
      ref={buttonRef}
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
  isSelected?: boolean;
};

function SwatchWithRemove({
  color,
  onSelect,
  onRemove,
  ariaLabel,
  removeLabel,
  isSelected,
}: SwatchWithRemoveProps) {
  return (
    <div className={styles.swatchShell}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={color}
        className={`${styles.swatchButton} ${isSelected ? styles.swatchSelected : ""}`}
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
