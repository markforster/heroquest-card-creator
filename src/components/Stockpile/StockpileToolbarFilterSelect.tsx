"use client";

import { useMemo } from "react";
import { Filter } from "lucide-react";
import Select, { type FormatOptionLabelMeta, type GroupBase, type SingleValue } from "react-select";

import styles from "@/app/page.module.css";
import {
  FormSelectDropdownIndicator,
  getFormSelectStyles,
  renderPlainFormSelectOption,
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

export default function StockpileToolbarFilterSelect({
  value,
  onChange,
  options,
  disabled = false,
  inputId,
  ariaLabel,
}: StockpileToolbarFilterSelectProps) {
  const selectStyles = useMemo(
    () => getFormSelectStyles<StockpilePrimaryToolbarFilterOption>(disabled),
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
          <Filter size={14} aria-hidden="true" />
          <span>{option.label}</span>
        </span>
      );
    }

    return (
      <div className={styles.stockpilePrimaryToolbarFilterOption}>
        <span className={styles.stockpilePrimaryToolbarFilterOptionText}>
          {renderPlainFormSelectOption(option)}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.stockpilePrimaryToolbarFilter}>
      <Select<StockpilePrimaryToolbarFilterOption, false, GroupBase<StockpilePrimaryToolbarFilterOption>>
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
        formatGroupLabel={(group) => (
          <div className={styles.stockpilePrimaryToolbarFilterGroupLabel}>{group.label}</div>
        )}
      />
    </div>
  );
}
