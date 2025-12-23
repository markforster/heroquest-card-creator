"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import styles from "@/app/page.module.css";

import type { ReactNode, MouseEvent } from "react";

type ModalShellProps = {
  isOpen: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  /** Optional extra class for the inner panel (e.g. cardsPopover). */
  contentClassName?: string;
};

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  headerActions,
  contentClassName,
}: ModalShellProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={styles.templatePopoverBackdrop} onClick={handleBackdropClick}>
      <div
        className={`${styles.templatePopover} modal-content${contentClassName ? ` ${contentClassName}` : ""}`}
        onClick={handleContentClick}
      >
        <div className={`${styles.templatePopoverHeader} modal-header`}>
          <h2 className={styles.templatePopoverTitle}>{title}</h2>
          <div className={styles.modalHeaderActions}>
            {headerActions}
            <button type="button" className={styles.modalCloseButton} onClick={onClose}>
              <X className={styles.icon} aria-hidden="true" />
              <span className="visually-hidden">Close</span>
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
