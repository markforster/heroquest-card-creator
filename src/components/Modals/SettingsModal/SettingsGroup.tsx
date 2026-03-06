"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";

type SettingsGroupProps = {
  title?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

export default function SettingsGroup({
  title,
  className,
  disabled = false,
  children,
}: SettingsGroupProps) {
  const classes = [
    styles.settingsGroup,
    disabled ? styles.settingsPanelSectionDisabled : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {title ? <div className={styles.settingsGroupTitle}>{title}</div> : null}
      {children}
    </div>
  );
}
