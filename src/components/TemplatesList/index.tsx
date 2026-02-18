"use client";

import { useCallback, useMemo } from "react";

import styles from "@/app/page.module.css";
import { cardTemplates } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

import TemplateCard from "./TemplateCard";

type TemplatesListProps = {
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  variant?: "grid" | "sidebar";
};

type TemplateOption = {
  id: TemplateId;
  label: string;
  thumbnail: { src: string } | string;
};

export default function TemplatesList({
  selectedId,
  onSelect,
  variant = "grid",
}: TemplatesListProps) {
  const { language } = useI18n();
  const isSidebar = variant === "sidebar";

  const templates = useMemo<TemplateOption[]>(
    () =>
      cardTemplates.map((template) => ({
        id: template.id,
        label: getTemplateNameLabel(language, template),
        thumbnail: template.thumbnail,
      })),
    [language],
  );

  const handleSelect = useCallback(
    (id: TemplateId) => {
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <div className={isSidebar ? styles.templateSidebarList : styles.templateGrid}>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          id={template.id}
          isSelected={template.id === selectedId}
          label={template.label}
          thumbnail={template.thumbnail}
          variant={variant}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
