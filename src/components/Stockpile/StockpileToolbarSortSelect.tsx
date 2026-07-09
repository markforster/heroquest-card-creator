"use client";

import { useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import Select, { type FormatOptionLabelMeta, type SingleValue, type StylesConfig } from "react-select";

import styles from "@/app/page.module.css";
import { FormSelectDropdownIndicator, getFormSelectStyles } from "@/components/common/FormSelect";
import type {
  StockpilePrimaryToolbarSortOption,
  StockpilePrimaryToolbarSortValue,
} from "@/components/Stockpile/types";

type StockpileToolbarSortSelectProps = {
  value: StockpilePrimaryToolbarSortValue;
  onChange: (next: StockpilePrimaryToolbarSortValue) => void;
  options: StockpilePrimaryToolbarSortOption[];
  disabled?: boolean;
  inputId?: string;
  ariaLabel: string;
};

function getStockpileToolbarSortStyles(
  disabled: boolean,
): StylesConfig<StockpilePrimaryToolbarSortOption, false> {
  const baseStyles = getFormSelectStyles<StockpilePrimaryToolbarSortOption>(disabled);

  return {
    ...baseStyles,
    menu: (base) => ({
      ...base,
      zIndex: 5,
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
      padding: 0,
      borderRadius: 8,
      border: state.isSelected ? "1px solid rgba(230, 179, 90, 0.6)" : "1px solid transparent",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
  };
}

export default function StockpileToolbarSortSelect({
  value,
  onChange,
  options,
  disabled = false,
  inputId,
  ariaLabel,
}: StockpileToolbarSortSelectProps) {
  const selectStyles = useMemo(() => getStockpileToolbarSortStyles(disabled), [disabled]);
  const menuPortalTarget = typeof document === "undefined" ? undefined : document.body;
  const selected = options.find((option) => option.value === value) ?? options[0] ?? null;

  const handleChange = (next: SingleValue<StockpilePrimaryToolbarSortOption>) => {
    if (!next) return;
    onChange(next.value);
  };

  const formatOptionLabel = (
    option: StockpilePrimaryToolbarSortOption,
    meta: FormatOptionLabelMeta<StockpilePrimaryToolbarSortOption>,
  ) => {
    if (meta.context === "value") {
      return (
        <span className={styles.stockpilePrimaryToolbarSortValue}>
          <ArrowUpDown size={14} aria-hidden="true" />
          <span>{option.label}</span>
        </span>
      );
    }

    return (
      <div className={styles.stockpilePrimaryToolbarSortOption}>
        <span className={styles.stockpilePrimaryToolbarSortOptionText}>{option.label}</span>
      </div>
    );
  };

  return (
    <div className={styles.stockpilePrimaryToolbarSort}>
      <Select<StockpilePrimaryToolbarSortOption, false>
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
