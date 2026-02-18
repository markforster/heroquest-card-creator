"use client";

import Image from "next/image";

import styles from "@/app/page.module.css";
import type { TemplateId } from "@/types/templates";

type TemplateCardVariant = "grid" | "sidebar";

type TemplateCardProps = {
  id: TemplateId;
  isSelected: boolean;
  label: string;
  thumbnail: { src: string } | string;
  variant: TemplateCardVariant;
  onSelect: (id: TemplateId) => void;
};

export default function TemplateCard({
  id,
  isSelected,
  label,
  thumbnail,
  variant,
  onSelect,
}: TemplateCardProps) {
  const isSidebar = variant === "sidebar";
  const thumbnailSrc = typeof thumbnail === "string" ? thumbnail : thumbnail.src;
  const buttonClassName = isSidebar
    ? `${styles.templateSidebarCard} ${isSelected ? styles.templateSidebarCardSelected : ""}`
    : `${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`;

  return (
    <button type="button" className={buttonClassName} onClick={() => onSelect(id)}>
      {isSidebar ? (
        <div className={styles.templateSidebarThumbWrapper}>
          <Image
            src={thumbnailSrc}
            alt={label}
            className={styles.templateSidebarThumb}
            fill
            sizes="(max-width: 900px) 37.5px, 75px"
          />
        </div>
      ) : (
        <div className={styles.templateCardThumbWrapper}>
          <Image
            src={thumbnailSrc}
            alt={label}
            className={styles.templateCardThumb}
            width={75}
            height={105}
          />
        </div>
      )}
    </button>
  );
}
