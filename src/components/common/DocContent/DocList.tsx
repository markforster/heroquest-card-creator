"use client";

import styles from "./DocContent.module.css";

import type { ReactNode } from "react";

type DocListProps = {
  children: ReactNode;
  className?: string;
};

export default function DocList({ children, className }: DocListProps) {
  return <ul className={`${styles.docList}${className ? ` ${className}` : ""}`}>{children}</ul>;
}
