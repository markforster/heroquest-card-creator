"use client";

import styles from "./ColorPickerField.module.css";

import type { ReactNode, RefObject } from "react";

export type SwatchActionButtonProps = {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  buttonRef?: RefObject<HTMLButtonElement>;
  isActive?: boolean;
  children: ReactNode;
};

export default function SwatchActionButton({
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
