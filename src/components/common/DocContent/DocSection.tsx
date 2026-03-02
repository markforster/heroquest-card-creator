"use client";

import styles from "./DocContent.module.css";

import type { ReactNode } from "react";

type DocSectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function DocSection({ title, children, className }: DocSectionProps) {
  return (
    <section className={`${styles.docSection}${className ? ` ${className}` : ""}`}>
      <h3 className={styles.docHeading}>{title}</h3>
      {children}
    </section>
  );
}
