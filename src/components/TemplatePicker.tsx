"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ModalShell from "@/components/ModalShell";
import TemplatesList from "@/components/TemplatesList";
import { cardTemplates } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { TemplateId } from "@/types/templates";

type TemplatePickerProps = {
  isOpen: boolean;
  currentTemplateId: string | null;
  onApply: (templateId: string) => void;
  onClose: () => void;
};

export default function TemplatePicker({
  isOpen,
  currentTemplateId,
  onApply,
  onClose,
}: TemplatePickerProps) {
  const { t } = useI18n();
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(currentTemplateId);
  const templateIds = useMemo(() => cardTemplates.map((template) => template.id), []);

  // Keep local selection in sync when the current template changes while open.
  useEffect(() => {
    setPendingTemplateId(currentTemplateId);
  }, [currentTemplateId]);

  const applySelection = useCallback(
    (templateId: string | null) => {
      if (!templateId) return;
      onApply(templateId);
      onClose();
    },
    [onApply, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!templateIds.length) return;
      const currentIndex = pendingTemplateId
        ? templateIds.indexOf(pendingTemplateId as TemplateId)
        : -1;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0 ? 0 : (currentIndex + 1) % templateIds.length;
        setPendingTemplateId(templateIds[nextIndex]);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0
            ? templateIds.length - 1
            : (currentIndex - 1 + templateIds.length) % templateIds.length;
        setPendingTemplateId(templateIds[nextIndex]);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (!pendingTemplateId) return;
        event.preventDefault();
        applySelection(pendingTemplateId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, pendingTemplateId, templateIds, applySelection]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.chooseTemplate")}
      keepMounted
    >
      <TemplatesList
        selectedId={pendingTemplateId as TemplateId | null}
        onSelect={(id) => {
          applySelection(id);
        }}
        variant="grid"
      />
    </ModalShell>
  );
}
