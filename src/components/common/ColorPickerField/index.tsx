"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RgbaColorPicker } from "react-colorful";

import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useSharedColorSwatches } from "@/hooks/useSharedColorSwatches";
import { useI18n } from "@/i18n/I18nProvider";
import { formatHexColor, parseHexColor } from "@/lib/color";
import { clamp } from "@/lib/math";

import styles from "./ColorPickerField.module.css";

import type { CSSProperties, ReactNode, RefObject } from "react";

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
  showSmartTab?: boolean;
  showSavedTab?: boolean;
  showDefaultOption?: boolean;
  showTransparentOption?: boolean;
  showRevertOption?: boolean;
  showSaveOption?: boolean;
  presetSwatches?: string[];
  swatchShape?: "circle" | "square";
  swatchIcon?: ReactNode;
};

const FALLBACK_PANEL_BG = "#202020";
const ICON_LIGHT = "#f5f5f5";
const ICON_DARK = "#111111";

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return { r, g, b };
}

function computeRelativeLuminance({ r, g, b }: Rgb): number {
  const sr = r / 255;
  const sg = g / 255;
  const sb = b / 255;
  const rl = sr <= 0.03928 ? sr / 12.92 : Math.pow((sr + 0.055) / 1.055, 2.4);
  const gl = sg <= 0.03928 ? sg / 12.92 : Math.pow((sg + 0.055) / 1.055, 2.4);
  const bl = sb <= 0.03928 ? sb / 12.92 : Math.pow((sb + 0.055) / 1.055, 2.4);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function blendColors(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  const clamped = Math.min(1, Math.max(0, alpha));
  return {
    r: Math.round(foreground.r * clamped + background.r * (1 - clamped)),
    g: Math.round(foreground.g * clamped + background.g * (1 - clamped)),
    b: Math.round(foreground.b * clamped + background.b * (1 - clamped)),
  };
}

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
  showSmartTab = true,
  showSavedTab = true,
  showDefaultOption = true,
  showTransparentOption = true,
  showRevertOption = true,
  showSaveOption = true,
  presetSwatches = [],
  swatchShape = "circle",
  swatchIcon,
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
        if (
          align === "right" &&
          spaceRight < popoverRect.width + offset &&
          spaceLeft > spaceRight
        ) {
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

  const transparentHex = toNormalizedHex(transparentValue, true) ?? "#00000000";
  const normalizedSelected =
    toNormalizedHex(selectedValue, allowAlpha) ?? toNormalizedHex(defaultColor, allowAlpha);
  const isTransparent = isTransparentValue(selectedValue, transparentValue);
  const normalizedInput = isTransparent
    ? transparentHex
    : (toNormalizedHex(inputValue, allowAlpha) ??
      toNormalizedHex(selectedValue, allowAlpha) ??
      toNormalizedHex(defaultColor, allowAlpha) ??
      "#000000FF");
  const normalizedDefault = toNormalizedHex(defaultColor, true);
  const normalizedSelectedUpper = normalizedSelected?.toUpperCase();
  const swatchKeys = new Set(swatches.map((swatch) => swatch.toUpperCase()));
  const canSaveSwatch =
    Boolean(normalizedSelectedUpper) &&
    normalizedSelectedUpper !== normalizedDefault?.toUpperCase() &&
    !isTransparent &&
    !swatchKeys.has(normalizedSelectedUpper ?? "");
  const previewHex = isEditingHex ? normalizeDraftHex(hexDraft, allowAlpha) : null;
  const pickerColor = isTransparent
    ? { r: 0, g: 0, b: 0, a: 0 }
    : hexToRgba(previewHex ?? normalizedInput);

  const swatchIconColor = useMemo(() => {
    if (!swatchIcon) return undefined;
    if (typeof window === "undefined") return ICON_LIGHT;

    const rootStyles = window.getComputedStyle(document.documentElement);
    const panelBgRaw = rootStyles.getPropertyValue("--hq-panel-bg").trim();
    const panelParsed = parseHexColor(panelBgRaw) ?? parseHexColor(FALLBACK_PANEL_BG);
    const panelRgb = panelParsed ? hexToRgb(panelParsed.hex) : hexToRgb(FALLBACK_PANEL_BG);

    const selectedParsed = parseHexColor(selectedValue, { allowTransparent: true });
    if (!selectedParsed || selectedParsed.alpha <= 0) {
      const luminance = computeRelativeLuminance(panelRgb);
      return luminance >= 0.5 ? ICON_DARK : ICON_LIGHT;
    }

    const swatchRgb = hexToRgb(selectedParsed.hex);
    const blended = blendColors(swatchRgb, panelRgb, selectedParsed.alpha);
    const luminance = computeRelativeLuminance(blended);
    return luminance >= 0.5 ? ICON_DARK : ICON_LIGHT;
  }, [selectedValue, swatchIcon]);

  useEffect(() => {
    if (isEditingHex) return;
    setHexDraft(normalizedInput);
  }, [isEditingHex, normalizedInput]);

  const handleChangeNormalized = (value: string) => {
    const normalized = toNormalizedHex(value, allowAlpha);
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

  const resolvedTabs: ActiveTab[] = ["picker"];
  if (showSavedTab) resolvedTabs.push("saved");
  if (showSmartTab) resolvedTabs.push("smart");
  const showTabHeader = resolvedTabs.length > 1;

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
          {(() => {
            const style: CSSProperties & Record<string, string> = {};
            if (!isTransparent) {
              style.backgroundColor = previewHex ?? normalizedSelected ?? selectedValue;
            }
            if (swatchIconColor) {
              style["--hq-swatch-icon"] = swatchIconColor;
            }
            const swatchStyle = Object.keys(style).length > 0 ? style : undefined;
            return (
          <button
            type="button"
            ref={swatchRef}
            aria-label={`${t("actions.select")} ${selectedValue}`}
            title={selectedValue}
            className={`${styles.currentSwatch} ${isTransparent ? styles.noBorderSwatch : ""} ${
              isDisabled ? styles.currentSwatchDisabled : ""
            } ${swatchShape === "square" ? styles.currentSwatchSquare : ""}`}
            style={swatchStyle}
            onClick={isDisabled ? undefined : onToggleOpen}
            disabled={isDisabled}
          >
            {swatchIcon ? <span className={styles.swatchOverlayIcon}>{swatchIcon}</span> : null}
          </button>
            );
          })()}
        </div>
      </div>
      {isOpen && !isDisabled ? (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={popoverStyle ? { left: popoverStyle.left, top: popoverStyle.top } : undefined}
        >
          {showTabHeader ? (
            <div className={styles.tabHeader}>
              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "picker" ? styles.tabButtonActive : ""}`}
                onClick={() => handleSelectTab("picker")}
              >
                {t("label.picker")}
              </button>
              {showSavedTab ? (
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === "saved" ? styles.tabButtonActive : ""}`}
                  onClick={() => handleSelectTab("saved")}
                >
                  {t("label.saved")}
                </button>
              ) : null}
              {showSmartTab ? (
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === "smart" ? styles.tabButtonActive : ""}`}
                  onClick={() => handleSelectTab("smart")}
                >
                  {t("label.smart")}
                </button>
              ) : null}
            </div>
          ) : null}
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
                {presetSwatches.length > 0 ? (
                  <div className={styles.presetSwatches}>
                    {presetSwatches.map((swatch) => (
                      <SwatchButton
                        key={swatch}
                        color={swatch}
                        label={`${t("actions.select")} ${swatch}`}
                        title={swatch}
                        isSelected={
                          toNormalizedHex(swatch, true) === toNormalizedHex(selectedValue, true)
                        }
                        onClick={() => handleChangeNormalized(swatch)}
                      />
                    ))}
                  </div>
                ) : null}
                {showDefaultOption || showRevertOption || showTransparentOption || showSaveOption ? (
                  <div className={styles.actionRow}>
                    {showDefaultOption ? (
                      <SwatchButton
                        color={defaultColor}
                        label={`${t("actions.select")} ${defaultColor}`}
                        title={t("form.heroquestDefaultBrown")}
                        isSelected={
                          toNormalizedHex(defaultColor, true) === toNormalizedHex(selectedValue, true)
                        }
                        onClick={onSelectDefault}
                      />
                    ) : null}
                    {showRevertOption ? (
                      <SwatchActionButton
                        label={t("actions.cancel")}
                        title={t("actions.cancel")}
                        disabled={!canRevert}
                        onClick={onRevert}
                      >
                        ↺
                      </SwatchActionButton>
                    ) : null}
                    {showTransparentOption ? (
                      <SwatchButton
                        color={transparentValue}
                        label={`${t("actions.select")} ${t("form.noBorder")}`}
                        title={t("form.noBorder")}
                        className={styles.noBorderSwatch}
                        isSelected={isTransparent}
                        onClick={onSelectTransparent}
                      />
                    ) : null}
                    {showSaveOption ? (
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
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {activeTab === "saved" && showSavedTab ? (
              <div className={styles.swatches}>
                <div className={styles.specialRow}>
                  <SwatchButton
                    color={defaultColor}
                    label={`${t("actions.select")} ${defaultColor}`}
                    title={t("form.heroquestDefaultBrown")}
                    isSelected={
                      toNormalizedHex(defaultColor, true) === toNormalizedHex(selectedValue, true)
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
                          toNormalizedHex(swatch, true) === toNormalizedHex(selectedValue, true)
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
            {activeTab === "smart" && showSmartTab ? (
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

function hexToRgba(value: string): RgbaColor {
  const parsed = parseHexColor(value);
  if (!parsed) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  const hex = parsed.hexWithAlpha.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = parseInt(hex.slice(6, 8), 16) / 255;
  return { r, g, b, a };
}

function rgbaToHex({ r, g, b, a }: RgbaColor): string {
  const channel = (value: number) => {
    const hex = Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, "0");
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
    return toNormalizedHex(`#${raw}`, allowAlpha);
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
  const parsed = parseHexColor(value);
  if (!parsed || !parsed.inputHasAlpha) return false;
  return parsed.hexWithAlpha.slice(7, 9) === "00";
}

function toNormalizedHex(value: string | undefined, allowAlpha: boolean): string | null {
  if (!value) return null;
  if (!value.trim()) return null;
  if (value.trim().toLowerCase() === "transparent") return null;
  const parsed = parseHexColor(value);
  if (!parsed) return null;
  return formatHexColor(parsed, {
    alphaMode: allowAlpha ? "force" : "strip",
    case: "upper",
  });
}

type SwatchButtonProps = {
  color: string;
  label: string;
  title?: string;
  onClick: () => void;
  className?: string;
  isSelected?: boolean;
};

function SwatchButton({ color, label, title, onClick, className, isSelected }: SwatchButtonProps) {
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
