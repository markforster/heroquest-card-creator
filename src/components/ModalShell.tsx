"use client";

import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { useEscapeModalAware } from "@/components/EscapeStackProvider";

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
  keepMounted?: boolean;
};

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  headerActions,
  contentClassName,
  keepMounted = false,
}: ModalShellProps) {
  const { t } = useI18n();
  const escapeId = useMemo(
    () => `modal-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  useEscapeModalAware({
    id: escapeId,
    isOpen,
    onEscape: onClose,
  });

  if (!isOpen && !keepMounted) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className={styles.templatePopoverBackdrop}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
      style={
        !isOpen
          ? { visibility: "hidden", pointerEvents: "none", opacity: 0 }
          : undefined
      }
    >
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
              <span className="visually-hidden">{t("actions.close")}</span>
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
