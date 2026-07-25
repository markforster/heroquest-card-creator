"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "@/app/page.module.css";
import CardTitlePill from "@/components/common/CardTitlePill";
import type { TemplateId } from "@/types/templates";

type TemplateCardVariant = "grid" | "sidebar";

const SHOW_GRID_TEMPLATE_TITLES = false;

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
  const [isActive, setIsActive] = useState(false);
  const isSidebar = variant === "sidebar";
  const thumbnailSrc = typeof thumbnail === "string" ? thumbnail : thumbnail.src;
  const buttonClassName = isSidebar
    ? `${styles.templateSidebarCard} ${isSelected ? styles.templateSidebarCardSelected : ""}`
    : `${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`;

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => onSelect(id)}
      onMouseEnter={SHOW_GRID_TEMPLATE_TITLES ? () => setIsActive(true) : undefined}
      onMouseLeave={SHOW_GRID_TEMPLATE_TITLES ? () => setIsActive(false) : undefined}
      onFocus={SHOW_GRID_TEMPLATE_TITLES ? () => setIsActive(true) : undefined}
      onBlur={SHOW_GRID_TEMPLATE_TITLES ? () => setIsActive(false) : undefined}
    >
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
        <>
          <div className={styles.templateCardThumbWrapper}>
            <Image
              src={thumbnailSrc}
              alt={SHOW_GRID_TEMPLATE_TITLES ? "" : label}
              className={styles.templateCardThumb}
              width={75}
              height={105}
            />
          </div>
          {SHOW_GRID_TEMPLATE_TITLES ? (
            <CardTitlePill text={label} active={isActive} className={styles.templateCardTitlePill} />
          ) : null}
        </>
      )}
    </button>
  );
}
