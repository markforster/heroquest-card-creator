"use client";

import type { ReactNode } from "react";

import styles from "./SegmentedControl.module.css";

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  prefix?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  options: Array<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.control} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.button} ${value === option.value ? styles.buttonActive : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.prefix ? (
            <span className={styles.buttonPrefix} aria-hidden="true">
              {option.prefix}
            </span>
          ) : null}
          <span className={styles.buttonLabel}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
