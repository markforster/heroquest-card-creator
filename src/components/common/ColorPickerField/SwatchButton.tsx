"use client";

import styles from "./ColorPickerField.module.css";

export type SwatchButtonProps = {
  color: string;
  label: string;
  title?: string;
  onClick: () => void;
  className?: string;
  isSelected?: boolean;
};

export default function SwatchButton({
  color,
  label,
  title,
  onClick,
  className,
  isSelected,
}: SwatchButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={`${styles.swatchButton} ${isSelected ? styles.swatchSelected : ""} ${
        className ?? ""
      }`}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
}
