"use client";

import type { ReactNode } from "react";

import styles from "./DocContent.module.css";

type DocParagraphProps = {
  children: ReactNode;
  className?: string;
};

export default function DocParagraph({ children, className }: DocParagraphProps) {
  return <p className={`${styles.docParagraph}${className ? ` ${className}` : ""}`}>{children}</p>;
}
