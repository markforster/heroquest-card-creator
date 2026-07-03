"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";

type InspectorPanelHeaderProps = {
  title?: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  reserveTitleSpace?: boolean;
};

export default function InspectorPanelHeader({
  title,
  actions,
  disabled = false,
  reserveTitleSpace = false,
}: InspectorPanelHeaderProps) {
  const hasTitle = title != null && title !== "";

  return (
    <div
      className={`${styles.inspectorPanelHeader} ${
        disabled ? styles.inspectorPanelHeaderDisabled : ""
      }`.trim()}
    >
      <div className={styles.inspectorPanelHeaderMain}>
        {hasTitle ? (
          <div className={styles.inspectorPanelHeaderTitle}>{title}</div>
        ) : reserveTitleSpace ? (
          <div className={styles.inspectorPanelHeaderTitleSpacer} aria-hidden="true" />
        ) : null}
      </div>
      <div className={styles.inspectorPanelHeaderSpacer} aria-hidden="true" />
      {actions ? (
        <div className={`${styles.inspectorPanelHeaderActions} ${styles.uRowSm}`}>{actions}</div>
      ) : null}
    </div>
  );
}
