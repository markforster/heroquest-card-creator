"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
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
  swatches: string[];
  smartGroups: SmartGroup[];
  isSmartBusy: boolean;
  onRequestSmart: () => void;
  onChange: (value: string) => void;
  onSelectDefault: () => void;
  onSelectTransparent: () => void;
  onSaveSwatch: () => void;
  onRemoveSwatch: (color: string) => void;
  canSaveSwatch: boolean;
  canRevert: boolean;
  onRevert: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  popoverAlign?: "auto" | "left" | "right";
  popoverVAlign?: "center" | "top" | "bottom";
  showLabel?: boolean;
  showInput?: boolean;
};

export default function ColorPickerField({
  label,
  inputValue,
  selectedValue,
  defaultColor,
  transparentValue = "transparent",
  swatches,
  smartGroups,
  isSmartBusy,
  onRequestSmart,
  onChange,
  onSelectDefault,
  onSelectTransparent,
  onSaveSwatch,
  onRemoveSwatch,
  canSaveSwatch,
  canRevert,
  onRevert,
  isOpen,
  onToggleOpen,
  onClose,
  popoverAlign = "auto",
  popoverVAlign = "center",
  showLabel = true,
  showInput = true,
}: ColorPickerFieldProps) {
  const { t } = useI18n();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const swatchRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<{ left: number; top: number } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("picker");

  const popoverPlacement = usePopoverPlacement({
    isOpen,
    anchorRef: swatchRef,
    popoverRef,
    padding: 12,
    offset: 8,
  });

  useOutsideClick([popoverRef, swatchRef], onClose, isOpen);

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

  const isTransparent = selectedValue.trim().toLowerCase() === transparentValue;

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
            <HexColorInput
              className={styles.hexInput}
              color={inputValue}
              onChange={onChange}
              prefixed
            />
          </div>
        ) : null}
        <div className={styles.swatchWrap}>
          <button
            type="button"
            ref={swatchRef}
            aria-label={`${t("actions.select")} ${selectedValue}`}
            title={selectedValue}
            className={`${styles.currentSwatch} ${isTransparent ? styles.noBorderSwatch : ""}`}
            style={isTransparent ? undefined : { backgroundColor: selectedValue }}
            onClick={onToggleOpen}
          />
        </div>
      </div>
      {isOpen ? (
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
                <HexColorPicker
                  color={inputValue}
                  onChange={onChange}
                  className={styles.colorful}
                />
                <div className={styles.actionRow}>
                  <SwatchButton
                    color={defaultColor}
                    label={`${t("actions.select")} ${defaultColor}`}
                    title={t("form.heroquestDefaultBrown")}
                    isSelected={selectedValue.toUpperCase() === defaultColor.toUpperCase()}
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
                    isSelected={selectedValue.toLowerCase() === transparentValue}
                    onClick={onSelectTransparent}
                  />
                  <SwatchActionButton
                    label={t("form.saveSwatch")}
                    title={t("form.saveSwatch")}
                    disabled={!canSaveSwatch}
                    onClick={onSaveSwatch}
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
                    isSelected={selectedValue.toUpperCase() === defaultColor.toUpperCase()}
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
                    isSelected={selectedValue.toLowerCase() === transparentValue}
                    onClick={onSelectTransparent}
                  />
                </div>
                <div className={styles.swatchGridScroll}>
                  <div className={styles.swatchGrid}>
                    {swatches.map((swatch) => (
                      <SwatchWithRemove
                        key={swatch}
                        color={swatch}
                        isSelected={swatch.toUpperCase() === selectedValue.toUpperCase()}
                        onSelect={() => onChange(swatch)}
                        onRemove={() => onRemoveSwatch(swatch)}
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
                              onClick={() => onChange(color)}
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
