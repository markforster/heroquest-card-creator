"use client";

import styles from "@/app/page.module.css";

import type { MouseEvent, ReactNode } from "react";

type ModalPanelProps = {
  contentClassName?: string;
  children: ReactNode;
};

export default function ModalPanel({ contentClassName, children }: ModalPanelProps) {
  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`${styles.templatePopover} modal-content${contentClassName ? ` ${contentClassName}` : ""}`}
      onClick={handleContentClick}
    >
      {children}
    </div>
  );
}
