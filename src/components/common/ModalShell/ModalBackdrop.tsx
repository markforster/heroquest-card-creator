"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

type ModalBackdropProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function ModalBackdrop({ isOpen, onClose, children }: ModalBackdropProps) {
  return (
    <div
      className={styles.templatePopoverBackdrop}
      onClick={onClose}
      aria-hidden={!isOpen}
      style={!isOpen ? { visibility: "hidden", pointerEvents: "none", opacity: 0 } : undefined}
    >
      {children}
    </div>
  );
}
