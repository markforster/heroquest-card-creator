"use client";

import styles from "@/app/page.module.css";

type LanguageOption = {
  code: string;
  label: string;
  title: string;
  flag: string;
};

type LanguageMenuPopoverProps = {
  isOpen: boolean;
  primaryOptions: LanguageOption[];
  detectedOption: LanguageOption | null;
  onSelect: (code: string) => void;
};

export default function LanguageMenuPopover({
  isOpen,
  primaryOptions,
  detectedOption,
  onSelect,
}: LanguageMenuPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.leftNavMenuPopover} role="menu">
      <div className={styles.leftNavMenuGrid}>
        {primaryOptions.map((option) => (
          <button
            key={option.code}
            type="button"
            className={styles.leftNavMenuItem}
            role="menuitem"
            title={option.title}
            onClick={() => onSelect(option.code)}
          >
            <span className={styles.leftNavMenuText}>{option.label}</span>
          </button>
        ))}
      </div>
      {detectedOption ? (
        <div className={styles.leftNavMenuDetectedSection}>
          <button
            type="button"
            className={`${styles.leftNavMenuItem} ${styles.leftNavMenuDetectedItem}`}
            role="menuitem"
            title={detectedOption.title}
            onClick={() => onSelect(detectedOption.code)}
          >
            <span className={styles.leftNavMenuText}>{detectedOption.label}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
