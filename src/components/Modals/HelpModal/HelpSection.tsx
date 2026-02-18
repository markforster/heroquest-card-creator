"use client";

import type { ReactNode } from "react";

import styles from "./HelpModal.module.css";

type HelpSectionProps = {
  title: ReactNode;
  children: ReactNode;
};

export default function HelpSection({ title, children }: HelpSectionProps) {
  return (
    <section className={styles.helpSection}>
      <h3 className={styles.helpHeading}>{title}</h3>
      {children}
    </section>
  );
}
