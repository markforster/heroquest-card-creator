"use client";

import { useMemo } from "react";
import { BringToFront, Layers3, SendToBack } from "lucide-react";
import Select, {
  type FormatOptionLabelMeta,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import styles from "@/app/page.module.css";
import {
  FormSelectDropdownIndicator,
  getFormSelectStyles,
} from "@/components/common/FormSelect";
import type {
  StockpilePrimaryToolbarFilterGroup,
  StockpilePrimaryToolbarFilterOption,
} from "@/components/Stockpile/types";

type StockpileToolbarFilterSelectProps = {
  value: string;
  onChange: (next: string) => void;
  options: StockpilePrimaryToolbarFilterGroup[];
  disabled?: boolean;
  inputId?: string;
  ariaLabel: string;
};

function renderFilterLeadingVisual(value: string) {
  if (value === "all") {
    return <Layers3 size={12} aria-hidden="true" className={styles.stockpilePrimaryToolbarFilterOptionIcon} />;
  }
  if (value === "face:front") {
    return (
      <BringToFront size={12} aria-hidden="true" className={styles.stockpilePrimaryToolbarFilterOptionIcon} />
    );
  }
  if (value === "face:back") {
    return <SendToBack size={12} aria-hidden="true" className={styles.stockpilePrimaryToolbarFilterOptionIcon} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${styles.stockpilePrimaryToolbarFilterOptionMarker} ${getFilterMarkerClassName(value)}`}
    />
  );
}

function getFilterMarkerClassName(value: string): string {
  if (!value.startsWith("type:")) return styles.stockpilePrimaryToolbarFilterMarkerSpacer;

  const templateId = value.slice("type:".length);
  if (!templateId || templateId === "all") return styles.stockpilePrimaryToolbarFilterMarkerSpacer;
  if (templateId === "hero") return styles.stockpilePrimaryToolbarFilterMarkerHero;
  if (templateId === "monster") return styles.stockpilePrimaryToolbarFilterMarkerMonster;
  if (templateId === "spell") return styles.stockpilePrimaryToolbarFilterMarkerSpell;
  if (templateId === "large-treasure" || templateId === "small-treasure") {
    return styles.stockpilePrimaryToolbarFilterMarkerTreasure;
  }
  if (templateId === "hero-back" || templateId === "labelled-back") {
    return styles.stockpilePrimaryToolbarFilterMarkerBack;
  }
  return styles.stockpilePrimaryToolbarFilterMarkerDefault;
}

function getStockpileToolbarFilterStyles(
  disabled: boolean,
): StylesConfig<StockpilePrimaryToolbarFilterOption, false> {
  const baseStyles = getFormSelectStyles<StockpilePrimaryToolbarFilterOption>(disabled);

  return {
    ...baseStyles,
    control: (base, state) => ({
      ...baseStyles.control?.(base, state),
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
    }),
    singleValue: (base, state) => ({
      ...baseStyles.singleValue?.(base, state),
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 5,
      width: "max-content",
      minWidth: "100%",
      maxWidth: "min(28rem, calc(100vw - 2rem))",
      backgroundColor: "var(--hq-popover-bg)",
      border: "1px solid var(--hq-popover-border)",
      borderRadius: 12,
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden",
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.35rem",
      maxHeight: 320,
    }),
    group: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
    }),
    groupHeading: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "rgba(230, 179, 90, 0.12)"
        : state.isFocused
          ? "rgba(230, 179, 90, 0.08)"
          : "transparent",
      color: "var(--hq-text)",
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
      whiteSpace: "nowrap",
      padding: 0,
      borderRadius: 8,
      border: state.isSelected ? "1px solid rgba(230, 179, 90, 0.6)" : "1px solid transparent",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    placeholder: (base, state) => ({
      ...baseStyles.placeholder?.(base, state),
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
    }),
    input: (base, state) => ({
      ...baseStyles.input?.(base, state),
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
    }),
  };
}

export default function StockpileToolbarFilterSelect({
  value,
  onChange,
  options,
  disabled = false,
  inputId,
  ariaLabel,
}: StockpileToolbarFilterSelectProps) {
  const selectStyles = useMemo(
    () => getStockpileToolbarFilterStyles(disabled),
    [disabled],
  );
  const menuPortalTarget = typeof document === "undefined" ? undefined : document.body;
  const flatOptions = useMemo(() => options.flatMap((group) => group.options), [options]);
  const selected = flatOptions.find((option) => option.value === value) ?? flatOptions[0] ?? null;

  const handleChange = (next: SingleValue<StockpilePrimaryToolbarFilterOption>) => {
    if (!next) return;
    onChange(next.value);
  };

  const formatOptionLabel = (
    option: StockpilePrimaryToolbarFilterOption,
    meta: FormatOptionLabelMeta<StockpilePrimaryToolbarFilterOption>,
  ) => {
    if (meta.context === "value") {
      return (
        <span className={styles.stockpilePrimaryToolbarFilterValue}>
          {renderFilterLeadingVisual(option.value)}
          <span>{option.label}</span>
        </span>
      );
    }

    return (
      <div className={styles.stockpilePrimaryToolbarFilterOption}>
        <div className={styles.stockpilePrimaryToolbarFilterOptionStart}>
          {renderFilterLeadingVisual(option.value)}
          <span className={styles.stockpilePrimaryToolbarFilterOptionText}>{option.label}</span>
        </div>
        {typeof option.count === "number" ? (
          <span className={styles.stockpilePrimaryToolbarFilterOptionCountBadge}>{option.count}</span>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.stockpilePrimaryToolbarFilter}>
      <Select<StockpilePrimaryToolbarFilterOption, false>
        inputId={inputId}
        aria-label={ariaLabel}
        classNamePrefix="form-select"
        isClearable={false}
        isSearchable={false}
        isDisabled={disabled}
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        options={flatOptions}
        value={selected}
        onChange={handleChange}
        styles={selectStyles}
        components={{ DropdownIndicator: FormSelectDropdownIndicator }}
        formatOptionLabel={formatOptionLabel}
      />
    </div>
  );
}
