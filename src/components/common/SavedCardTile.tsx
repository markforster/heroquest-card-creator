"use client";

import styles from "@/app/page.module.css";

import type { ReactNode } from "react";

export type SavedCardTileVariant = "stockpile" | "recent";

export type SavedCardTileProps = {
  title: string;
  templateLabel: string;
  thumbnail: ReactNode;
  variant: SavedCardTileVariant;
  topContent?: ReactNode;
  bottomContent?: ReactNode;
  showDefaultTitlePill?: boolean;
  showDefaultTypePill?: boolean;
  className?: string;
  titlePillClassName?: string;
  typePillClassName?: string;
  topToolbarTestId?: string;
  bottomToolbarTestId?: string;
};

export default function SavedCardTile({
  title,
  templateLabel,
  thumbnail,
  variant,
  topContent,
  bottomContent,
  showDefaultTitlePill = true,
  showDefaultTypePill = true,
  className,
  titlePillClassName,
  typePillClassName,
  topToolbarTestId,
  bottomToolbarTestId,
}: SavedCardTileProps) {
  return (
    <div
      className={[
        styles.savedCardTileShell,
        variant === "stockpile" ? styles.savedCardTileShellStockpile : styles.savedCardTileShellRecent,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.savedCardTileTopToolbar} data-testid={topToolbarTestId}>
        {topContent}
        {showDefaultTitlePill ? (
          <div
            className={[styles.savedCardTileTitlePill, titlePillClassName].filter(Boolean).join(" ")}
            title={title}
          >
            {title}
          </div>
        ) : null}
      </div>
      <div className={styles.savedCardTileCore}>{thumbnail}</div>
      <div className={styles.savedCardTileBottomToolbar} data-testid={bottomToolbarTestId}>
        {bottomContent}
        {showDefaultTypePill ? (
          <div
            className={[styles.savedCardTileTypePill, typePillClassName].filter(Boolean).join(" ")}
          >
            {templateLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
