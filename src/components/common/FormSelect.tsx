"use client";

import { useMemo, type ReactNode } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type GroupBase,
  type FormatOptionLabelMeta,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import styles from "./FormSelect.module.css";

export type FormSelectOption = {
  value: string;
  label: string;
};

export type FormSelectRenderMeta = {
  context: "menu" | "value";
};

type FormSelectProps = {
  options: FormSelectOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  inputId?: string;
  ariaLabel?: string;
  className?: string;
  renderOptionLabel?: (option: FormSelectOption, meta: FormSelectRenderMeta) => ReactNode;
};

export function FormSelectDropdownIndicator<Option extends FormSelectOption>(
  props: DropdownIndicatorProps<Option, false, GroupBase<Option>>,
) {
  return (
    <components.DropdownIndicator {...props}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="m2 5 6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </components.DropdownIndicator>
  );
}

export function getFormSelectStyles<Option extends FormSelectOption>(
  disabled: boolean,
): StylesConfig<Option, false, GroupBase<Option>> {
  const backgroundColor = disabled
    ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
    : "var(--hq-input-bg)";

  return {
    container: (base) => ({
      ...base,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: 0,
      alignItems: "stretch",
      backgroundColor,
      borderColor: state.isFocused ? "var(--hq-focus-ring)" : "var(--hq-border-mid)",
      borderRadius: 4,
      boxShadow: "none",
      fontSize: "var(--hq-control-text-primary)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: "var(--hq-control-line-height)",
      opacity: disabled ? 0.7 : 1,
      cursor: disabled ? "not-allowed" : "default",
      "&:hover": {
        borderColor: state.isFocused ? "var(--hq-focus-ring)" : "var(--hq-border-mid)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      alignItems: "center",
      backgroundColor,
      padding: "0 0.5rem",
    }),
    singleValue: (base) => ({
      ...base,
      position: "static",
      transform: "none",
      top: "auto",
      marginLeft: 0,
      marginRight: 0,
      width: "100%",
      maxWidth: "100%",
      color: "var(--hq-text)",
      fontSize: "var(--hq-control-text-primary)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: "var(--hq-control-line-height)",
      overflow: "hidden",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 5,
      backgroundColor: "var(--hq-popover-bg)",
      border: "1px solid var(--hq-popover-border)",
      boxShadow: "var(--shadow-popover)",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 1200,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused
        ? "rgba(230, 179, 90, 0.16)"
        : state.isSelected
          ? "rgba(230, 179, 90, 0.24)"
          : "transparent",
      color: "var(--hq-text)",
      padding: "0.2rem 0.5rem",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      fontSize: "var(--hq-control-text-primary)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: "var(--hq-control-line-height)",
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--hq-input-placeholder)",
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: "var(--hq-control-line-height)",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      alignSelf: "center",
      display: "flex",
      alignItems: "center",
      backgroundColor,
      padding: "0 0.5rem 0 0",
      color: "var(--hq-text)",
      "&:hover": { color: "var(--hq-text)" },
    }),
    indicatorsContainer: (base) => ({
      ...base,
      alignSelf: "center",
      alignItems: "center",
      backgroundColor,
    }),
    input: (base) => ({
      ...base,
      color: "var(--hq-text)",
      margin: 0,
      padding: 0,
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: 0,
    }),
  };
}

export function renderPlainFormSelectOption(option: FormSelectOption) {
  return (
    <div className={styles.optionContent}>
      <span className={styles.optionLabel} title={option.label}>
        {option.label}
      </span>
    </div>
  );
}

export default function FormSelect<Option extends FormSelectOption>({
  options,
  value,
  onChange,
  disabled = false,
  inputId,
  ariaLabel,
  className,
  renderOptionLabel,
}: Omit<FormSelectProps, "options" | "renderOptionLabel"> & {
  options: Option[];
  renderOptionLabel?: (option: Option, meta: FormSelectRenderMeta) => ReactNode;
}) {
  const selectStyles = useMemo(() => getFormSelectStyles<Option>(disabled), [disabled]);
  const menuPortalTarget = typeof document === "undefined" ? undefined : document.body;
  const selected = options.find((option) => option.value === value) ?? options[0] ?? null;

  const handleChange = (next: SingleValue<Option>) => {
    if (!next) return;
    onChange(next.value);
  };

  const formatOptionLabel = (option: Option, meta: FormatOptionLabelMeta<Option>) =>
    renderOptionLabel
      ? renderOptionLabel(option, { context: meta.context })
      : renderPlainFormSelectOption(option);

  return (
    <div className={`${styles.selectRoot}${className ? ` ${className}` : ""}`}>
      <Select<Option, false>
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
