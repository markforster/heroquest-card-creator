"use client";

import type { ReactNode } from "react";

import styles from "./DocContent.module.css";

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
