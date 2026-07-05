"use client";

import { useMemo } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import { useI18n } from "@/i18n/I18nProvider";

import styles from "./CutMarkStyleSelect.module.css";

export type CutMarkStyleValue = "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";

type CutMarkStyleOption = {
  value: CutMarkStyleValue;
  label: string;
};

type CutMarkStyleSelectProps = {
  value: CutMarkStyleValue;
  disabled?: boolean;
  onChange: (next: CutMarkStyleValue) => void;
};

function DropdownIndicator(props: DropdownIndicatorProps<CutMarkStyleOption, false>) {
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

function getSelectStyles(disabled: boolean): StylesConfig<CutMarkStyleOption, false> {
  return {
    container: (base) => ({
      ...base,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: 0,
      backgroundColor: disabled
        ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
        : "var(--hq-input-bg)",
      borderColor: state.isFocused ? "var(--hq-focus-ring)" : "var(--hq-border-mid)",
      borderRadius: 4,
      boxShadow: "none",
      fontSize: "var(--text-lg)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: 1.5,
      opacity: disabled ? 0.7 : 1,
      cursor: disabled ? "not-allowed" : "default",
      "&:hover": {
        borderColor: state.isFocused ? "var(--hq-focus-ring)" : "var(--hq-border-mid)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      backgroundColor: disabled
        ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
        : "var(--hq-input-bg)",
      padding: "0.25rem 0.5rem",
    }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      maxWidth: "100%",
      color: "var(--hq-text)",
      fontSize: "var(--text-lg)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: 1.5,
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
      fontSize: "var(--text-lg)",
      fontFamily: "var(--hq-font-form)",
      lineHeight: 1.5,
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--hq-input-placeholder)",
      lineHeight: 1.5,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      alignSelf: "stretch",
      display: "flex",
      alignItems: "center",
      backgroundColor: disabled
        ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
        : "var(--hq-input-bg)",
      padding: "0.25rem 0.5rem 0.25rem 0",
      color: "var(--hq-text)",
      "&:hover": { color: "var(--hq-text)" },
    }),
    indicatorsContainer: (base) => ({
      ...base,
      alignSelf: "stretch",
      backgroundColor: disabled
        ? "color-mix(in srgb, var(--hq-input-bg) 82%, var(--hq-surface) 18%)"
        : "var(--hq-input-bg)",
    }),
    input: (base) => ({
      ...base,
      color: "var(--hq-text)",
      margin: 0,
      padding: 0,
      lineHeight: 1.5,
    }),
  };
}

function renderPreview(style: CutMarkStyleValue) {
  if (style === "ticks") {
    return (
      <svg
        viewBox="0 0 60 12"
        className={styles.previewSvg}
        aria-hidden="true"
        focusable="false"
      >
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="6" y1="8.5" x2="10" y2="3.5" />
          <line x1="18" y1="8.5" x2="22" y2="3.5" />
          <line x1="30" y1="8.5" x2="34" y2="3.5" />
          <line x1="42" y1="8.5" x2="46" y2="3.5" />
          <line x1="54" y1="8.5" x2="58" y2="3.5" />
        </g>
      </svg>
    );
  }

  const dashArray =
    style === "dashed"
      ? "6 4"
      : style === "long-dashed"
        ? "10 6"
        : style === "dotted"
          ? "1 5"
          : undefined;
  const lineCap = style === "dotted" ? "round" : "butt";

  return (
    <svg
      viewBox="0 0 60 12"
      className={styles.previewSvg}
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="2"
        y1="6"
        x2="58"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap={lineCap}
        strokeDasharray={dashArray}
      />
    </svg>
  );
}

export default function CutMarkStyleSelect({
  value,
  disabled = false,
  onChange,
}: CutMarkStyleSelectProps) {
  const { t } = useI18n();
  const selectStyles = useMemo(() => getSelectStyles(disabled), [disabled]);
  const menuPortalTarget = typeof document === "undefined" ? undefined : document.body;

  const options = useMemo<CutMarkStyleOption[]>(
    () => [
      { value: "dashed", label: t("label.cutMarkStyleDashed") },
      { value: "dotted", label: t("label.cutMarkStyleDotted") },
      { value: "long-dashed", label: t("label.cutMarkStyleLongDashed") },
      { value: "solid", label: t("label.cutMarkStyleSolid") },
      { value: "ticks", label: t("label.cutMarkStyleTicks") },
    ],
    [t],
  );

  const selected = options.find((option) => option.value === value) ?? options[0];

  const handleChange = (next: SingleValue<CutMarkStyleOption>) => {
    if (!next) return;
    onChange(next.value);
  };

  return (
    <div className={styles.selectRoot}>
      <Select<CutMarkStyleOption, false>
        classNamePrefix="cut-mark-style-select"
        isClearable={false}
        isSearchable={false}
        isDisabled={disabled}
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        options={options}
        value={selected}
        onChange={handleChange}
        styles={selectStyles}
        components={{ DropdownIndicator }}
        formatOptionLabel={(option) => (
          <div className={styles.optionContent}>
            <span className={styles.optionLabel} title={option.label}>
              {option.label}
            </span>
            <span
              className={styles.optionPreview}
              data-cut-mark-style-preview={option.value}
              aria-hidden="true"
            >
              {renderPreview(option.value)}
            </span>
          </div>
        )}
      />
    </div>
  );
}
