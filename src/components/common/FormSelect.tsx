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

export type FormSelectLayoutVariant = "default" | "preview";

type FormSelectProps = {
  options: FormSelectOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  inputId?: string;
  ariaLabel?: string;
  className?: string;
  layoutVariant?: FormSelectLayoutVariant;
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
  layoutVariant: FormSelectLayoutVariant = "default",
): StylesConfig<Option, false, GroupBase<Option>> {
  const backgroundColor = disabled
    ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
    : "var(--hq-input-bg)";
  const isPreviewLayout = layoutVariant === "preview";

  return {
    container: (base) => ({
      ...base,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: 0,
      alignItems: isPreviewLayout ? "stretch" : "center",
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
      display: isPreviewLayout ? base.display : "flex",
      alignItems: "center",
      backgroundColor,
      padding: isPreviewLayout ? "0 0.5rem" : "0.25rem 0.5rem",
    }),
    singleValue: (base) => ({
      ...base,
      position: "static",
      transform: "none",
      top: "auto",
      margin: isPreviewLayout ? undefined : 0,
      marginLeft: isPreviewLayout ? 0 : undefined,
      marginRight: isPreviewLayout ? 0 : undefined,
      width: isPreviewLayout ? "100%" : undefined,
      maxWidth: "100%",
      color: "var(--hq-text)",
      fontSize: "var(--hq-control-text-primary)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: "var(--hq-control-line-height)",
      display: isPreviewLayout ? undefined : "flex",
      alignItems: isPreviewLayout ? undefined : "center",
      overflow: isPreviewLayout ? "hidden" : undefined,
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
      alignSelf: isPreviewLayout ? "center" : "stretch",
      display: "flex",
      alignItems: "center",
      backgroundColor,
      padding: isPreviewLayout ? "0 0.5rem 0 0" : "0.25rem 0.5rem 0.25rem 0",
      color: "var(--hq-text)",
      "&:hover": { color: "var(--hq-text)" },
    }),
    indicatorsContainer: (base) => ({
      ...base,
      alignSelf: isPreviewLayout ? "center" : "stretch",
      alignItems: "center",
      backgroundColor,
    }),
    input: (base) => ({
      ...base,
      color: "var(--hq-text)",
      margin: 0,
      padding: 0,
      fontSize: "var(--hq-control-text-primary)",
      lineHeight: isPreviewLayout ? 0 : "var(--hq-control-line-height)",
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
  layoutVariant = "default",
  renderOptionLabel,
}: Omit<FormSelectProps, "options" | "renderOptionLabel"> & {
  options: Option[];
  renderOptionLabel?: (option: Option, meta: FormSelectRenderMeta) => ReactNode;
}) {
  const selectStyles = useMemo(
    () => getFormSelectStyles<Option>(disabled, layoutVariant),
    [disabled, layoutVariant],
  );
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
