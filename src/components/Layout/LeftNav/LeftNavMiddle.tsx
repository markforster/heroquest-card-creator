"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";


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
