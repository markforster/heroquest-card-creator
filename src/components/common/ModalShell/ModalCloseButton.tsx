"use client";

import { X } from "lucide-react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type ModalCloseButtonProps = {
  onClose: () => void;
};

export default function ModalCloseButton({ onClose }: ModalCloseButtonProps) {
  const { t } = useI18n();

  return (
    <button type="button" className={styles.modalCloseButton} onClick={onClose}>
      <X className={styles.icon} aria-hidden="true" />
      <span className="visually-hidden">{t("actions.close")}</span>
    </button>
  );
}
