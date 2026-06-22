"use client";

import { X } from "lucide-react";

import styles from "./ColorPickerField.module.css";

export type SwatchWithRemoveProps = {
  color: string;
  onSelect: () => void;
  onRemove: () => void;
  ariaLabel: string;
  removeLabel: string;
  isSelected?: boolean;
};

export default function SwatchWithRemove({
  color,
  onSelect,
  onRemove,
  ariaLabel,
  removeLabel,
  isSelected,
}: SwatchWithRemoveProps) {
  return (
    <div className={styles.swatchShell}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={color}
        className={`${styles.swatchButton} ${isSelected ? styles.swatchSelected : ""}`}
        style={{ backgroundColor: color }}
        onClick={onSelect}
      />
      <button
        type="button"
        aria-label={removeLabel}
        className={styles.swatchRemove}
        onClick={onRemove}
      >
        <X aria-hidden size={10} />
      </button>
    </div>
  );
}
