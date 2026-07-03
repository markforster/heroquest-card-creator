"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";

type InspectorStateNoticeVariant = "empty" | "prerequisite" | "loading" | "error";

type InspectorStateNoticeProps = {
  variant?: InspectorStateNoticeVariant;
  title: ReactNode;
  body: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  role?: "status" | "alert";
  className?: string;
};

const variantClassNames: Record<InspectorStateNoticeVariant, string> = {
  empty: styles.inspectorStateNoticeEmpty,
  prerequisite: styles.inspectorStateNoticePrerequisite,
  loading: styles.inspectorStateNoticeLoading,
  error: styles.inspectorStateNoticeError,
};

export default function InspectorStateNotice({
  variant = "empty",
  title,
  body,
  hint,
  icon,
  role = "status",
  className = "",
}: InspectorStateNoticeProps) {
  return (
    <div
      className={`${styles.inspectorStateNotice} ${variantClassNames[variant]} ${className}`.trim()}
      role={role}
    >
      {icon ? <div className={styles.inspectorStateNoticeIcon}>{icon}</div> : null}
      <div className={styles.inspectorStateNoticeContent}>
        <div className={styles.inspectorStateNoticeTitle}>{title}</div>
        <div className={styles.inspectorStateNoticeBody}>{body}</div>
        {hint ? <div className={styles.inspectorStateNoticeHint}>{hint}</div> : null}
      </div>
    </div>
  );
}
