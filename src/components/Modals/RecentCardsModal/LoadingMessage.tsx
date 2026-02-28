"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type LoadingMessageProps = {
  children: ReactNode;
};

export default function LoadingMessage({ children }: LoadingMessageProps) {
  return <div className={styles.templatePopoverMessage}>{children}</div>;
}
