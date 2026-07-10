"use client";

import { useMemo } from "react";
import { Rows3 } from "lucide-react";
import Select, { type FormatOptionLabelMeta, type SingleValue, type StylesConfig } from "react-select";

import styles from "@/app/page.module.css";
import { FormSelectDropdownIndicator, getFormSelectStyles } from "@/components/common/FormSelect";
import type {
  StockpilePrimaryToolbarGroupOption,
  StockpilePrimaryToolbarGroupValue,
} from "@/components/Stockpile/types";

type StockpileToolbarGroupSelectProps = {
  value: StockpilePrimaryToolbarGroupValue;
  onChange: (next: StockpilePrimaryToolbarGroupValue) => void;
  options: StockpilePrimaryToolbarGroupOption[];
  disabled?: boolean;
  inputId?: string;
  ariaLabel: string;
};

function getStockpileToolbarGroupStyles(
  disabled: boolean,
): StylesConfig<StockpilePrimaryToolbarGroupOption, false> {
  const baseStyles = getFormSelectStyles<StockpilePrimaryToolbarGroupOption>(disabled);

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
      maxWidth: "min(20rem, calc(100vw - 2rem))",
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

export default function StockpileToolbarGroupSelect({
  value,
  onChange,
  options,
  disabled = false,
  inputId,
  ariaLabel,
}: StockpileToolbarGroupSelectProps) {
  const selectStyles = useMemo(() => getStockpileToolbarGroupStyles(disabled), [disabled]);
  const menuPortalTarget = typeof document === "undefined" ? undefined : document.body;
  const selected = options.find((option) => option.value === value) ?? options[0] ?? null;

  const handleChange = (next: SingleValue<StockpilePrimaryToolbarGroupOption>) => {
    if (!next) return;
    onChange(next.value);
  };

  const formatOptionLabel = (
    option: StockpilePrimaryToolbarGroupOption,
    meta: FormatOptionLabelMeta<StockpilePrimaryToolbarGroupOption>,
  ) => {
    if (meta.context === "value") {
      return (
        <span className={styles.stockpilePrimaryToolbarGroupValue}>
          <Rows3 size={14} aria-hidden="true" />
          <span>{option.label}</span>
        </span>
      );
    }

    return (
      <div className={styles.stockpilePrimaryToolbarGroupOption}>
        <span className={styles.stockpilePrimaryToolbarGroupOptionText}>{option.label}</span>
      </div>
    );
  };

  return (
    <div className={styles.stockpilePrimaryToolbarGroup}>
      <Select<StockpilePrimaryToolbarGroupOption, false>
        inputId={inputId}
        aria-label={ariaLabel}
        classNamePrefix="form-select"
        isClearable={false}
        isSearchable={false}
        isDisabled={disabled}
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        options={options}
        value={selected}
        onChange={handleChange}
        styles={selectStyles}
        components={{ DropdownIndicator: FormSelectDropdownIndicator }}
        formatOptionLabel={formatOptionLabel}
      />
    </div>
  );
}
