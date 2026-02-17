"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "@/app/page.module.css";

type LeftNavCollapseToggleProps = {
  isCollapsed: boolean;
  label: string;
  onToggle: () => void;
};

export default function LeftNavCollapseToggle({
  isCollapsed,
  label,
  onToggle,
}: LeftNavCollapseToggleProps) {
  return (
    <div className={styles.leftNavTop}>
      <button
        className={styles.leftNavToggle}
        type="button"
        onClick={onToggle}
        title={label}
        aria-label={label}
      >
        {isCollapsed ? (
          <ChevronRight className={styles.leftNavToggleIcon} aria-hidden="true" />
        ) : (
          <ChevronLeft className={styles.leftNavToggleIcon} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
