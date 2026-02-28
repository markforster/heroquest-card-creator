"use client";

import type { ReactNode } from "react";

import styles from "@/app/page.module.css";

type LeftNavMiddleProps = {
  children: ReactNode;
};

export default function LeftNavMiddle({ children }: LeftNavMiddleProps) {
  return (
    <div className={styles.leftNavMiddle}>
      <div className={styles.leftNavList}>{children}</div>
    </div>
  );
}
