"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type LeftNavBottomProps = {
  children: ReactNode;
};

export default function LeftNavBottom({ children }: LeftNavBottomProps) {
  return (
    <div className={styles.leftNavBottom}>
      <div className={styles.leftNavList}>{children}</div>
    </div>
  );
}
