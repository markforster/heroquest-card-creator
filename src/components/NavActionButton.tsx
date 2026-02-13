"use client";

import styles from "@/app/page.module.css";

import type { ComponentType, ReactNode } from "react";

type NavActionButtonProps = {
  label: ReactNode;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function NavActionButton({
  label,
  icon: Icon,
  onClick,
  title,
  ariaLabel,
  isActive = false,
  disabled = false,
  className,
}: NavActionButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.leftNavItem}${isActive ? ` ${styles.leftNavItemActive}` : ""}${
        className ? ` ${className}` : ""
      }`}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      disabled={disabled}
    >
      <span className={styles.leftNavGlyph} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.leftNavLabel}>{label}</span>
    </button>
  );
}
