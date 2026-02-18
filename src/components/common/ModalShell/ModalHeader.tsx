"use client";

import styles from "@/app/page.module.css";

import ModalCloseButton from "./ModalCloseButton";

import type { ReactNode } from "react";

type ModalHeaderProps = {
  title: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
  hideHeader?: boolean;
};

export default function ModalHeader({
  title,
  headerActions,
  onClose,
  hideHeader = false,
}: ModalHeaderProps) {
  if (hideHeader) {
    return null;
  }

  return (
    <div className={`${styles.templatePopoverHeader} ${styles.uRowMd} modal-header`}>
      <h2 className={styles.templatePopoverTitle}>{title}</h2>
      <div className={styles.modalHeaderActions}>
        {headerActions}
        <ModalCloseButton onClose={onClose} />
      </div>
    </div>
  );
}
