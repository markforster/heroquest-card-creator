"use client";

import type { ReactNode } from "react";

import styles from "./HelpModal.module.css";

type HelpParagraphProps = {
  children: ReactNode;
};

export default function HelpParagraph({ children }: HelpParagraphProps) {
  return <p className={styles.helpParagraph}>{children}</p>;
}
