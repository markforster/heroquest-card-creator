"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type LanguageMenuButtonProps = {
  currentFlag: ReactNode;
  currentCode: string;
  currentLabel: string;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  ariaLabel: string;
};

export default function LanguageMenuButton({
  currentFlag,
  currentCode,
  currentLabel,
  isCollapsed,
  isOpen,
  onToggle,
  ariaLabel,
}: LanguageMenuButtonProps) {
  return (
    <button
      type="button"
      className={styles.leftNavMenuButton}
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      title={currentLabel}
    >
      <span className={styles.leftNavMenuFlag} aria-hidden="true">
        {currentFlag}
      </span>
      {!isCollapsed ? (
        <span className={styles.leftNavMenuLabel}>{currentCode}</span>
      ) : null}
    </button>
  );
}
