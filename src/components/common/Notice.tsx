"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

export type SettingsNoticeVariant = "info" | "success" | "warning" | "danger";

type SettingsNoticeProps = {
  variant?: SettingsNoticeVariant;
  role?: "status" | "alert";
  className?: string;
  children: ReactNode;
};

type NoticeWrapperProps = Omit<SettingsNoticeProps, "variant">;

const variantClasses: Record<SettingsNoticeVariant, { bootstrap: string; local: string }> = {
  info: {
    bootstrap: "alert-info",
    local: styles.settingsNoticeInfo,
  },
  success: {
    bootstrap: "alert-success",
    local: styles.settingsNoticeSuccess,
  },
  warning: {
    bootstrap: "alert-warning",
    local: styles.settingsNoticeWarning,
  },
  danger: {
    bootstrap: "alert-danger",
    local: styles.settingsNoticeDanger,
  },
};

export default function Notice({
  variant = "info",
  role = "status",
  className = "",
  children,
}: SettingsNoticeProps) {
  const { bootstrap, local } = variantClasses[variant];

  return (
    <div
      className={`alert ${bootstrap} ${styles.settingsNotice} ${local} ${className}`}
      role={role}
    >
      {children}
    </div>
  );
}

export function InfoNotice(props: NoticeWrapperProps) {
  return <Notice {...props} variant="info" />;
}

export function SuccessNotice(props: NoticeWrapperProps) {
  return <Notice {...props} variant="success" />;
}

export function WarningNotice(props: NoticeWrapperProps) {
  return <Notice variant="warning" {...props} />;
}

export function DangerNotice(props: NoticeWrapperProps) {
  return <Notice {...props} variant="danger" />;
}
