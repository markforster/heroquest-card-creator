"use client";

import { type RefObject } from "react";

import styles from "@/app/page.module.css";
import TextFittingSettingsContent from "@/components/TextFittingSettings/TextFittingSettingsContent";
import { useI18n } from "@/i18n/I18nProvider";

type TextFittingSettingsPopoverProps = {
  popoverRef: RefObject<HTMLDivElement>;
};

export default function TextFittingSettingsPopover({
  popoverRef,
}: TextFittingSettingsPopoverProps) {
  const { t } = useI18n();

  return (
    <div
      ref={popoverRef}
      className={styles.toolsToolbarPopover}
      role="dialog"
      aria-label={t("label.textFittingSettings")}
    >
      <div className={styles.toolsToolbarPopoverHeader}>{t("label.textFittingGlobal")}</div>
      <TextFittingSettingsContent />
    </div>
  );
}
