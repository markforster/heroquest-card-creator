"use client";

import styles from "./DocContent.module.css";

import type { ReactNode } from "react";

type DocSectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

export default function DocSection({ title, children, className, id }: DocSectionProps) {
  return (
    <section id={id} className={`${styles.docSection}${className ? ` ${className}` : ""}`}>
      <h3 id={id ? `${id}-heading` : undefined} className={styles.docHeading}>
        {title}
      </h3>
      {children}
    </section>
  );
}
