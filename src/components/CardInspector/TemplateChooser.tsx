"use client";

import { LayoutTemplate } from "lucide-react";

import styles from "@/app/page.module.css";
import IconButton from "@/components/IconButton";
import { useAppActions } from "@/components/AppActionsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function TemplateChooser() {
  const { t } = useI18n();
  const { hasTemplate, currentTemplateName, openTemplatePicker } = useAppActions();

  return (
    <div className={styles.inspectorHeader}>
      <div className={styles.inspectorSectionTitle}>{t("actions.template")}</div>
      <IconButton
        className={`btn btn-outline-light btn-sm ${styles.inspectorTemplateButton}`}
        icon={LayoutTemplate}
        disabled={!hasTemplate}
        onClick={openTemplatePicker}
        title={t("tooltip.chooseTemplate")}
      >
        {t("actions.template")}: {currentTemplateName ?? t("ui.loading")}
      </IconButton>
    </div>
  );
}
