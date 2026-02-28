"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

type LanguageMenuPopoverProps = {
  isOpen: boolean;
  options: LanguageOption[];
  onSelect: (code: string) => void;
};

export default function LanguageMenuPopover({
  isOpen,
  options,
  onSelect,
}: LanguageMenuPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.leftNavMenuPopover} role="menu">
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className={styles.leftNavMenuItem}
          role="menuitem"
          onClick={() => onSelect(option.code)}
        >
          <span className={styles.leftNavMenuText}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
