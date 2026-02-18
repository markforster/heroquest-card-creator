"use client";

import type { ReactNode } from "react";

import styles from "./HelpModal.module.css";

type HelpListProps = {
  children: ReactNode;
};

export default function HelpList({ children }: HelpListProps) {
  return <ul className={styles.helpList}>{children}</ul>;
}
