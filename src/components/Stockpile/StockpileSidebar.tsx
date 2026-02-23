"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileSidebarProps = {
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "collection"; id: string };
  onFilterChange: (
    next:
      | { type: "all" }
      | { type: "recent" }
      | { type: "unfiled" }
      | { type: "collection"; id: string },
  ) => void;
  isPairMode: boolean;
  selectedIds: string[];
  onClearSelection: () => void;
  recentCardsCount: number;
  overallCount: number;
  unfiledCount: number;
  visibleCollections: Array<{ id: string; name: string; description?: string; cardIds: string[] }>;
  collectionCounts: Map<string, number>;
  selectedCountByCollection: Map<string, number>;
};

export default function StockpileSidebar({
  activeFilter,
  onFilterChange,
  isPairMode,
  selectedIds,
  onClearSelection,
  recentCardsCount,
  overallCount,
  unfiledCount,
  visibleCollections,
  collectionCounts,
  selectedCountByCollection,
}: StockpileSidebarProps) {
  const { t } = useI18n();
  return (
    <aside
      className={`${styles.stockpileSidebar} d-flex flex-column gap-2`}
      aria-label={t("heading.collections")}
    >
      <div className={styles.stockpileSidebarHeader}>{t("heading.collections")}</div>
      <div className={styles.stockpileSidebarList}>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "recent" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "recent" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.recentCards")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {recentCardsCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "all" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "all" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.allCards")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {overallCount}
            </span>
          ) : selectedIds.length > 0 ? (
            <span className={styles.stockpileSelectedDot} aria-hidden="true" />
          ) : null}
        </button>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "unfiled" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "unfiled" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.unfiled")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {unfiledCount}
            </span>
          ) : null}
        </button>
        <div className={styles.stockpileSidebarDivider} />
      </div>
      <div className={styles.stockpileSidebarMiddle}>
        {visibleCollections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            className={`${styles.stockpileSidebarItem} ${
              activeFilter.type === "collection" && activeFilter.id === collection.id
                ? styles.stockpileSidebarItemActive
                : ""
            } d-flex align-items-center gap-2`}
            onClick={() => {
              onFilterChange({ type: "collection", id: collection.id });
              if (!isPairMode) {
                onClearSelection();
              }
            }}
            title={collection.description || collection.name}
          >
            <span className="flex-grow-1 text-truncate fs-6">{collection.name}</span>
            {!isPairMode ? (
              <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
                {collectionCounts.get(collection.id) ?? 0}
              </span>
            ) : null}
            {isPairMode && selectedCountByCollection.get(collection.id) ? (
              <span className={styles.stockpileSelectedDot} aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
