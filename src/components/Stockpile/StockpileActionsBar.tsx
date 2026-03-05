"use client";

import { useEffect, useRef } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/types/cards-db";
import type { ReactNode } from "react";

type StockpileActionsBarProps = {
  viewMode: "grid" | "table";
  onViewModeChange: (next: "grid" | "table") => void;
  isPairBacks: boolean;
  filteredCards: CardRecord[];
  selectedIds: string[];
  addToCollectionControl?: ReactNode;
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string };
  onRemoveFromCollection: () => void;
  onRestoreCards?: () => void;
  onDeleteCards: () => void;
  onSelectAllToggle: (visibleIds: string[]) => void;
};

export default function StockpileActionsBar({
  viewMode,
  onViewModeChange,
  isPairBacks,
  filteredCards,
  selectedIds,
  addToCollectionControl,
  activeFilter,
  onRemoveFromCollection,
  onRestoreCards,
  onDeleteCards,
  onSelectAllToggle,
}: StockpileActionsBarProps) {
  const { t } = useI18n();
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const checkbox = selectAllRef.current;
    if (!checkbox) return;
    if (filteredCards.length === 0) {
      checkbox.indeterminate = false;
      checkbox.checked = false;
      return;
    }
    const visibleIds = new Set(filteredCards.map((card) => card.id));
    const selectedVisible = selectedIds.filter((id) => visibleIds.has(id)).length;
    checkbox.checked = selectedVisible === visibleIds.size;
    checkbox.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.size;
  }, [filteredCards, selectedIds]);

  return (
    <div className={styles.stockpileActionsBar}>
      <div
        className={styles.stockpileViewToggle}
        role="group"
        aria-label={t("aria.viewMode")}
      >
        <button
          type="button"
          className={`${styles.stockpileViewButton} ${
            viewMode === "grid" ? styles.stockpileViewButtonActive : ""
          }`}
          aria-pressed={viewMode === "grid"}
          onClick={() => onViewModeChange("grid")}
        >
          {t("label.gridView")}
        </button>
        <button
          type="button"
          className={`${styles.stockpileViewButton} ${
            viewMode === "table" ? styles.stockpileViewButtonActive : ""
          }`}
          aria-pressed={viewMode === "table"}
          onClick={() => onViewModeChange("table")}
        >
          {t("label.tableView")}
        </button>
      </div>
      {isPairBacks ? null : (
        <label
          className="form-check form-check-inline mb-0"
          title={t("tooltip.selectAllCards")}
        >
          <input
            ref={selectAllRef}
            className="form-check-input hq-checkbox"
            type="checkbox"
            disabled={filteredCards.length === 0}
            onChange={() => {
              const visibleIds = filteredCards.map((card) => card.id);
              if (!visibleIds.length) return;
              onSelectAllToggle(visibleIds);
            }}
          />
          <span className={`form-check-label ${styles.selectAllLabel}`}>{t("form.selectAll")}</span>
        </label>
      )}
      <div className={`${styles.assetsActions} d-flex align-items-center gap-2 ms-auto`}>
        {addToCollectionControl ?? null}
        {activeFilter.type === "collection" ? (
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            disabled={!selectedIds.length}
            onClick={onRemoveFromCollection}
          >
            {t("actions.removeFromCollection")}
          </button>
        ) : null}
        {activeFilter.type === "recentlyDeleted" ? (
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            disabled={!selectedIds.length}
            onClick={onRestoreCards}
          >
            {selectedIds.length > 1
              ? `${t("actions.restore")} (${selectedIds.length})`
              : t("actions.restore")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          disabled={!selectedIds.length}
          onClick={onDeleteCards}
        >
          {(() => {
            const baseLabel =
              activeFilter.type === "recentlyDeleted"
                ? t("actions.deletePermanently")
                : t("actions.delete");
            if (selectedIds.length > 1) {
              return `${baseLabel} (${selectedIds.length})`;
            }
            return baseLabel;
          })()}
        </button>
      </div>
    </div>
  );
}
