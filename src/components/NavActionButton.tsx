"use client";

import { NavLink } from "react-router-dom";

import styles from "@/app/page.module.css";

import type { ComponentType, ReactNode } from "react";

type NavActionButtonProps = {
  label: ReactNode;
  icon: ComponentType<{ className?: string }>;
  to?: string;
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
  to,
  onClick,
  title,
  ariaLabel,
  isActive = false,
  disabled = false,
  className,
}: NavActionButtonProps) {
  const computedAriaLabel = ariaLabel ?? (typeof label === "string" ? label : undefined);
  const baseClassName = `${styles.leftNavItem}${className ? ` ${className}` : ""}`;

  if (to) {
    return (
      <NavLink
        to={to}
        className={({ isActive: linkActive }) =>
          `${baseClassName}${linkActive ? ` ${styles.leftNavItemActive}` : ""}`
        }
        onClick={onClick}
        title={title}
        aria-label={computedAriaLabel}
      >
        <span className={styles.leftNavGlyph} aria-hidden="true">
          <Icon />
        </span>
        <span className={styles.leftNavLabel}>{label}</span>
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      className={`${baseClassName}${isActive ? ` ${styles.leftNavItemActive}` : ""}`}
      onClick={onClick}
      title={title}
      aria-label={computedAriaLabel}
      disabled={disabled}
    >
      <span className={styles.leftNavGlyph} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.leftNavLabel}>{label}</span>
    </button>
  );
}
