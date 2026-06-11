"use client";

import { SquarePlus } from "lucide-react";

import type { CreateBoundaryPlaceholderProps } from "@/components/Decks/detail/boards/DeckSortableBoardView/types";
import { useI18n } from "@/i18n/I18nProvider";

import styles from "../../DeckGroupsSection2.module.css";

export function CreateBoundaryPlaceholder({
  index,
  onCreate,
  onHoverChange,
  visible,
}: CreateBoundaryPlaceholderProps) {
  const { t } = useI18n();

  return (
    <div
      className={[styles.createBoundary, visible ? styles.createBoundaryVisible : ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={`create-boundary-${index}`}
      aria-hidden={!visible}
    >
      <span
        className={[
          styles.createBoundaryLine,
          visible ? styles.createBoundaryLineVisible : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
      <button
        type="button"
        className={[
          styles.createBoundaryButton,
          visible ? styles.createBoundaryButtonVisible : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onCreate(index)}
        onPointerEnter={() => onHoverChange(index, true)}
        onPointerLeave={() => onHoverChange(index, false)}
        onMouseEnter={() => onHoverChange(index, true)}
        onMouseLeave={() => onHoverChange(index, false)}
        aria-label={t("decks.groups.actions.createAtPosition").replace("{index}", String(index))}
        title={t("decks.groups.actions.insertHere")}
        tabIndex={visible ? 0 : -1}
      >
        <SquarePlus className={styles.createBoundaryIcon} aria-hidden="true" />
      </button>
    </div>
  );
}
