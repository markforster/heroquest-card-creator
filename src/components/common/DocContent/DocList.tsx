"use client";

import type { ReactNode } from "react";

import styles from "./DocContent.module.css";

type DocListProps = {
  children: ReactNode;
  className?: string;
};

export default function DocList({ children, className }: DocListProps) {
  return <ul className={`${styles.docList}${className ? ` ${className}` : ""}`}>{children}</ul>;
}
