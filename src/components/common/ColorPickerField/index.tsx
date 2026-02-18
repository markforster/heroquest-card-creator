"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { RgbaColorPicker } from "react-colorful";

import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import { useSharedColorSwatches } from "@/hooks/useSharedColorSwatches";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";

import styles from "./ColorPickerField.module.css";

type SmartGroup = { id: string; colors: string[] };
type ActiveTab = "picker" | "saved" | "smart";

type ColorPickerFieldProps = {
  label: string;
  inputValue: string;
  selectedValue: string;
  defaultColor: string;
  transparentValue?: string;
  smartGroups: SmartGroup[];
  isSmartBusy: boolean;
  onRequestSmart: () => void;
  onChange: (value: string) => void;
  allowAlpha?: boolean;
  onSelectDefault: () => void;
  onSelectTransparent: () => void;
  canRevert: boolean;
  onRevert: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  popoverAlign?: "auto" | "left" | "right";
  popoverVAlign?: "center" | "top" | "bottom";
  showLabel?: boolean;
  showInput?: boolean;
  isDisabled?: boolean;
};

export default function ColorPickerField({
  label,
  inputValue,
  selectedValue,
  defaultColor,
  transparentValue = "transparent",
  smartGroups,
  isSmartBusy,
  onRequestSmart,
  onChange,
  allowAlpha = true,
  onSelectDefault,
  onSelectTransparent,
  canRevert,
  onRevert,
  isOpen,
  onToggleOpen,
  onClose,
  popoverAlign = "auto",
  popoverVAlign = "center",
  showLabel = true,
  showInput = true,
  isDisabled = false,
}: ColorPickerFieldProps) {
  const { t } = useI18n();
  const { swatches, saveSwatch, removeSwatch, maxSwatches } = useSharedColorSwatches();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const swatchRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<{ left: number; top: number } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("picker");
  const [hexDraft, setHexDraft] = useState<string>("");
  const [isEditingHex, setIsEditingHex] = useState(false);

  const popoverPlacement = usePopoverPlacement({
    isOpen,
    anchorRef: swatchRef,
    popoverRef,
    padding: 12,
    offset: 8,
  });

  useOutsideClick([popoverRef, swatchRef], onClose, isOpen);

  useEffect(() => {
    if (isDisabled && isOpen) {
      onClose();
    }
  }, [isDisabled, isOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      const anchor = swatchRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;

      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const padding = 12;
      const offset = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = 0;
      let top = 0;

      if (popoverAlign !== "auto" || popoverVAlign === "center") {
        const spaceLeft = anchorRect.left - padding;
        const spaceRight = viewportWidth - anchorRect.right - padding;
        let align = popoverAlign;
        if (align === "auto") {
          align = spaceRight >= popoverRect.width + offset ? "right" : "left";
        }
        if (align === "left" && spaceLeft < popoverRect.width + offset && spaceRight > spaceLeft) {
          align = "right";
        }
        if (align === "right" && spaceRight < popoverRect.width + offset && spaceLeft > spaceRight) {
          align = "left";
        }

        left =
          align === "left"
            ? anchorRect.left - popoverRect.width - offset
            : anchorRect.right + offset;

        if (popoverVAlign === "top") {
          top = anchorRect.top;
        } else if (popoverVAlign === "bottom") {
          top = anchorRect.bottom - popoverRect.height;
        } else {
          top = anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2;
        }
      } else {
        const preferredTop =
          popoverPlacement === "up"
            ? anchorRect.top - popoverRect.height - offset
            : anchorRect.bottom + offset;
        const preferredLeft = anchorRect.left;
        left = preferredLeft;
        top = preferredTop;
      }

      left = Math.min(Math.max(left, padding), viewportWidth - popoverRect.width - padding);
      top = Math.min(Math.max(top, padding), viewportHeight - popoverRect.height - padding);

      setPopoverStyle({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, popoverAlign, popoverPlacement, popoverVAlign]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("picker");
  }, [isOpen]);

  const transparentHex = normalizeHexColor(transparentValue, true) ?? "#00000000";
  const normalizedSelected =
    normalizeHexColor(selectedValue, allowAlpha) ?? normalizeHexColor(defaultColor, allowAlpha);
  const isTransparent = isTransparentValue(selectedValue, transparentValue);
  const normalizedInput = isTransparent
    ? transparentHex
    : normalizeHexColor(inputValue, allowAlpha) ??
      normalizeHexColor(selectedValue, allowAlpha) ??
      normalizeHexColor(defaultColor, allowAlpha) ??
      "#000000FF";
  const normalizedDefault = normalizeHexColor(defaultColor, true);
  const normalizedSelectedUpper = normalizedSelected?.toUpperCase();
  const swatchKeys = new Set(swatches.map((swatch) => swatch.toUpperCase()));
  const canSaveSwatch =
    Boolean(normalizedSelectedUpper) &&
    normalizedSelectedUpper !== normalizedDefault?.toUpperCase() &&
    !isTransparent &&
    !swatchKeys.has(normalizedSelectedUpper);
  const previewHex = isEditingHex ? normalizeDraftHex(hexDraft, allowAlpha) : null;
  const previewColor = previewHex ? hexToRgba(previewHex) : null;
  const pickerColor = isTransparent
    ? { r: 0, g: 0, b: 0, a: 0 }
    : hexToRgba(previewHex ?? normalizedInput);

  useEffect(() => {
    if (isEditingHex) return;
    setHexDraft(normalizedInput);
  }, [isEditingHex, normalizedInput]);

  const handleChangeNormalized = (value: string) => {
    const normalized = normalizeHexColor(value, allowAlpha);
    if (normalized) {
      onChange(normalized);
      return;
    }
    onChange(value);
  };

  const handleHexChange = (value: string) => {
    const sanitized = sanitizeHexInput(value);
    setIsEditingHex(true);
    setHexDraft(sanitized);
  };

  const commitHexDraft = () => {
    const normalized = normalizeDraftHex(hexDraft, allowAlpha);
    if (normalized) {
      onChange(normalized);
      setHexDraft(normalized);
    } else {
      setHexDraft(normalizedInput);
    }
    setIsEditingHex(false);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "smart" && !isSmartBusy && smartGroups.length === 0) {
      onRequestSmart();
    }
  };

  return (
    <div className={styles.field}>
      {showLabel ? <label className="form-label">{label}</label> : null}
      <div className={styles.fieldRow}>
        {showInput ? (
          <div className={styles.inputWrap}>
            <input
              className={styles.hexInput}
              type="text"
              value={hexDraft}
              onChange={(event) => handleHexChange(event.target.value)}
              disabled={isDisabled}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
              onBlur={commitHexDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHexDraft();
                }
              }}
            />
          </div>
        ) : null}
        <div className={styles.swatchWrap}>
          <button
            type="button"
            ref={swatchRef}
            aria-label={`${t("actions.select")} ${selectedValue}`}
            title={selectedValue}
            className={`${styles.currentSwatch} ${isTransparent ? styles.noBorderSwatch : ""} ${
              isDisabled ? styles.currentSwatchDisabled : ""
            }`}
            style={
              isTransparent
                ? undefined
                : {
                    backgroundColor:
                      previewHex ?? normalizedSelected ?? selectedValue,
                  }
            }
            onClick={isDisabled ? undefined : onToggleOpen}
            disabled={isDisabled}
          />
        </div>
      </div>
      {isOpen && !isDisabled ? (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={popoverStyle ? { left: popoverStyle.left, top: popoverStyle.top } : undefined}
        >
          <div className={styles.tabHeader}>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "picker" ? styles.tabButtonActive : ""}`}
              onClick={() => handleSelectTab("picker")}
            >
              {t("label.picker")}
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "saved" ? styles.tabButtonActive : ""}`}
              onClick={() => handleSelectTab("saved")}
            >
              {t("label.saved")}
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "smart" ? styles.tabButtonActive : ""}`}
              onClick={() => handleSelectTab("smart")}
            >
              {t("label.smart")}
            </button>
          </div>
          <div className={styles.tabContent}>
            {activeTab === "picker" ? (
              <div className={styles.picker}>
                <RgbaColorPicker
                  color={pickerColor}
                  onChange={(value) => {
                    const next = rgbaToHex(value);
                    handleChangeNormalized(next);
                    setIsEditingHex(false);
                    setHexDraft(next);
                  }}
                  className={styles.colorful}
                />
                <div className={styles.actionRow}>
                  <SwatchButton
                    color={defaultColor}
                    label={`${t("actions.select")} ${defaultColor}`}
                    title={t("form.heroquestDefaultBrown")}
                    isSelected={
                      normalizeHexColor(defaultColor, true) === normalizeHexColor(selectedValue, true)
                    }
                    onClick={onSelectDefault}
                  />
                  <SwatchActionButton
                    label={t("actions.cancel")}
                    title={t("actions.cancel")}
                    disabled={!canRevert}
                    onClick={onRevert}
                  >
                    ↺
                  </SwatchActionButton>
                  <SwatchButton
                    color={transparentValue}
                    label={`${t("actions.select")} ${t("form.noBorder")}`}
                    title={t("form.noBorder")}
                    className={styles.noBorderSwatch}
                    isSelected={isTransparent}
                    onClick={onSelectTransparent}
                  />
                  <SwatchActionButton
                    label={t("form.saveSwatch")}
                    title={t("form.saveSwatch")}
                    disabled={!canSaveSwatch}
                    onClick={() => {
                      if (!normalizedSelected) return;
                      void saveSwatch(normalizedSelected);
                    }}
                  >
                    <Plus aria-hidden size={14} />
                  </SwatchActionButton>
                </div>
              </div>
            ) : null}
            {activeTab === "saved" ? (
              <div className={styles.swatches}>
                <div className={styles.specialRow}>
                  <SwatchButton
                    color={defaultColor}
                    label={`${t("actions.select")} ${defaultColor}`}
                    title={t("form.heroquestDefaultBrown")}
                    isSelected={
                      normalizeHexColor(defaultColor, true) === normalizeHexColor(selectedValue, true)
                    }
                    onClick={onSelectDefault}
                  />
                  <SwatchActionButton
                    label={t("actions.cancel")}
                    title={t("actions.cancel")}
                    disabled={!canRevert}
                    onClick={onRevert}
                  >
                    ↺
                  </SwatchActionButton>
                  <SwatchButton
                    color={transparentValue}
                    label={`${t("actions.select")} ${t("form.noBorder")}`}
                    title={t("form.noBorder")}
                    className={styles.noBorderSwatch}
                    isSelected={isTransparent}
                    onClick={onSelectTransparent}
                  />
                </div>
                <div className={styles.swatchGridScroll}>
                  <div className={styles.swatchGrid}>
                    {swatches.slice(0, maxSwatches).map((swatch) => (
                      <SwatchWithRemove
                        key={swatch}
                        color={swatch}
                        isSelected={
                          normalizeHexColor(swatch, true) === normalizeHexColor(selectedValue, true)
                        }
                        onSelect={() => handleChangeNormalized(swatch)}
                        onRemove={() => {
                          void removeSwatch(swatch);
                        }}
                        ariaLabel={`${t("actions.select")} ${swatch}`}
                        removeLabel={`${t("actions.delete")} ${swatch}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {activeTab === "smart" ? (
              <div className={styles.smartTab}>
                <div className={styles.smartPopoverHeader}>{t("form.smartSuggestions")}</div>
                {isSmartBusy ? (
                  <div className={styles.smartPopoverHint}>{t("form.smartSwatchLoading")}</div>
                ) : smartGroups.length > 0 ? (
                  <div className={styles.swatchGridScroll}>
                    <div className={styles.smartPopoverGroups}>
                      {smartGroups.map((group) => (
                        <div key={group.id} className={styles.smartPopoverGroup}>
                          <div className={styles.smartPopoverGroupLabel}>
                            {t(`form.smartGroup.${group.id}` as never)}
                          </div>
                        <div className={styles.swatchGrid}>
                          {group.colors.slice(0, 5).map((color) => (
                            <button
                              key={`${group.id}-${color}`}
                              type="button"
                              className={styles.smartPopoverSwatch}
                              style={{ backgroundColor: color }}
                              title={color}
                              aria-label={`${t("actions.select")} ${color}`}
                              onClick={() => handleChangeNormalized(color)}
                            />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.smartPopoverHint}>{t("form.smartSwatchEmpty")}</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type RgbaColor = { r: number; g: number; b: number; a: number };

function normalizeHexColor(value: string | undefined, allowAlpha: boolean): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "transparent") return null;

  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null;

  if (raw.length === 3 || raw.length === 4) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    const a = raw.length === 4 ? raw[3] : "f";
    const hex = `${r}${r}${g}${g}${b}${b}${a}${a}`.toUpperCase();
    return allowAlpha ? `#${hex}` : `#${hex.slice(0, 6)}`;
  }

  if (raw.length === 6 || raw.length === 8) {
    const hex = raw.toUpperCase();
    if (allowAlpha) {
      return `#${hex.length === 6 ? `${hex}FF` : hex}`;
    }
    return `#${hex.slice(0, 6)}`;
  }

  return null;
}

function hexToRgba(value: string): RgbaColor {
  const normalized = normalizeHexColor(value, true);
  if (!normalized) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  const hex = normalized.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = parseInt(hex.slice(6, 8), 16) / 255;
  return { r, g, b, a };
}

function rgbaToHex({ r, g, b, a }: RgbaColor): string {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const channel = (value: number) => {
    const hex = Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
    return hex.toUpperCase();
  };
  const alpha = channel(Math.round(clamp(a ?? 1, 0, 1) * 255));
  return `#${channel(r)}${channel(g)}${channel(b)}${alpha}`;
}

function normalizeDraftHex(value: string, allowAlpha: boolean) {
  if (!value) return null;
  const rawValue = value.trim();
  if (!rawValue) return null;
  const raw = rawValue.startsWith("#") ? rawValue.slice(1) : rawValue;
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null;
  if (raw.length === 3 || raw.length === 4 || raw.length === 6 || raw.length === 8) {
    return normalizeHexColor(`#${raw}`, allowAlpha);
  }
  return null;
}

function sanitizeHexInput(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  const hasHash = trimmed.startsWith("#");
  const stripped = trimmed.replace(/#/g, "");
  const hexOnly = stripped.replace(/[^0-9a-fA-F]/g, "");
  return hasHash ? `#${hexOnly}` : hexOnly;
}

function isTransparentValue(value: string, transparentValue: string) {
  if (value.trim().toLowerCase() === "transparent") return true;
  if (value.trim().toLowerCase() === transparentValue.toLowerCase()) return true;
  const normalized = normalizeHexColor(value, true);
  if (!normalized) return false;
  return normalized.slice(7, 9) === "00";
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
