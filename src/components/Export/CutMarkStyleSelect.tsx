"use client";

import { useMemo } from "react";
import Select, {
  type SingleValue,
} from "react-select";

import {
  FormSelectDropdownIndicator,
  getFormSelectStyles,
  type FormSelectOption,
} from "@/components/common/FormSelect";
import { useI18n } from "@/i18n/I18nProvider";

import styles from "./CutMarkStyleSelect.module.css";

export type CutMarkStyleValue = "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";

type CutMarkStyleOption = FormSelectOption & { value: CutMarkStyleValue };

type CutMarkStyleSelectProps = {
  value: CutMarkStyleValue;
  disabled?: boolean;
  onChange: (next: CutMarkStyleValue) => void;
};

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
  const selectStyles = useMemo(() => getFormSelectStyles<CutMarkStyleOption>(disabled), [disabled]);
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
        components={{ DropdownIndicator: FormSelectDropdownIndicator }}
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
