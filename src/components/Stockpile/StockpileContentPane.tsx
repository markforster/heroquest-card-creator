"use client";

import styles from "@/app/page.module.css";
import StockpileCardsGrid from "@/components/Stockpile/StockpileCardsGrid";
import StockpileCardsTable from "@/components/Stockpile/StockpileCardsTable";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/types/cards-db";

type StockpileContentPaneProps = {
  filteredCards: CardRecord[];
  search: string;
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string };
  templateFilter: string;
  totalCount: number;
  filterLabel: string;
  isTableView: boolean;
  cardViews: StockpileCardView[];
  cardActions: StockpileCardActions;
  conflictPopoverCardId: string | null;
  isPairMode: boolean;
  dragEnabled: boolean;
  onClearSelection: () => void;
  tableHeaders: {
    card: string;
    name: string;
    type: string;
    face: string;
    modified: string;
    pairing: string;
  };
};

export default function StockpileContentPane({
  filteredCards,
  search,
  activeFilter,
  templateFilter,
  totalCount,
  filterLabel,
  isTableView,
  cardViews,
  cardActions,
  conflictPopoverCardId,
  isPairMode,
  dragEnabled,
  onClearSelection,
  tableHeaders,
}: StockpileContentPaneProps) {
  const { t } = useI18n();
  return (
    <div
      className={styles.assetsGridContainer}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClearSelection();
      }}
    >
      {filteredCards.length === 0 ? (
        <div className={styles.assetsEmptyState}>
          {search.trim()
            ? t("empty.noCardsFound")
            : activeFilter.type === "recent"
              ? t("empty.noRecentCards")
              : activeFilter.type === "recentlyDeleted"
                ? t("empty.noRecentlyDeletedCards")
              : activeFilter.type === "collection"
                ? templateFilter !== "all" && totalCount > 0
                  ? `${t("empty.collectionFilteredByType")} ${filterLabel}.`
                  : t("empty.collectionEmpty")
                : activeFilter.type === "unfiled"
                  ? t("empty.nothingUnfiled")
                  : t("empty.noSavedCards")}
        </div>
      ) : (
        <>
          {isTableView ? (
            <StockpileCardsTable
              items={cardViews}
              actions={cardActions}
              headers={tableHeaders}
              dragEnabled={dragEnabled}
              onClearSelection={onClearSelection}
            />
          ) : (
            <StockpileCardsGrid
              items={cardViews}
              actions={cardActions}
              isPairMode={isPairMode}
              conflictPopoverCardId={conflictPopoverCardId}
              dragEnabled={dragEnabled}
              onClearSelection={onClearSelection}
            />
          )}
        </>
      )}
    </div>
  );
}
