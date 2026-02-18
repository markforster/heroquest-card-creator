"use client";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import TemplatesList from "@/components/TemplatesList";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

type WelcomeTemplateModalProps = {
  isOpen: boolean;
  onSelect: (templateId: TemplateId) => void;
};

export default function WelcomeTemplateModal({ isOpen, onSelect }: WelcomeTemplateModalProps) {
  const { t } = useI18n();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => {}}
      title={t("heading.chooseTemplate")}
      hideHeader
      keepMounted
    >
      <div className={styles.templatePopoverMessage}>{t("empty.selectTemplate")}</div>
      <TemplatesList
        selectedId={null}
        onSelect={(id) => onSelect(id as TemplateId)}
        variant="grid"
      />
    </ModalShell>
  );
}
