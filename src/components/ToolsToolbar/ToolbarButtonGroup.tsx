"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type ToolbarButtonGroupProps = {
  children: ReactNode;
  role?: string;
};

export default function ToolbarButtonGroup({ children, role = "group" }: ToolbarButtonGroupProps) {
  return (
    <div className={`btn-group-vertical ${styles.toolsToolbarGroup}`} role={role}>
      {children}
    </div>
  );
}
