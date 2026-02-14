"use client";

import Image from "next/image";

import styles from "@/app/page.module.css";
import { cardTemplates } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

type TemplatesListProps = {
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  variant?: "grid" | "sidebar";
};

export default function TemplatesList({
  selectedId,
  onSelect,
  variant = "grid",
}: TemplatesListProps) {
  const { language } = useI18n();
  const isSidebar = variant === "sidebar";

  if (isSidebar) {
    return (
      <div className={styles.templateSidebarList}>
        {cardTemplates.map((template) => {
          const isSelected = template.id === selectedId;
          const templateLabel = getTemplateNameLabel(language, template);
          return (
            <button
              key={template.id}
              type="button"
              className={`${styles.templateSidebarCard} ${
                isSelected ? styles.templateSidebarCardSelected : ""
              }`}
              onClick={() => onSelect(template.id)}
            >
              <div className={styles.templateSidebarThumbWrapper}>
                <Image
                  src={template.thumbnail}
                  alt={templateLabel}
                  className={styles.templateSidebarThumb}
                  fill
                  sizes="(max-width: 900px) 37.5px, 75px"
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.templateGrid}>
      {cardTemplates.map((template) => {
        const isSelected = template.id === selectedId;
        const templateLabel = getTemplateNameLabel(language, template);
        return (
          <button
            key={template.id}
            type="button"
            className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`}
            onClick={() => onSelect(template.id)}
          >
            <div className={styles.templateCardThumbWrapper}>
              <Image
                src={template.thumbnail}
                alt={templateLabel}
                className={styles.templateCardThumb}
                width={75}
                height={105}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
