"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import StockpileAddToCollectionModal from "@/components/Stockpile/StockpileAddToCollectionModal";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { listCollections, updateCollection } from "@/lib/collections-db";
import type { CollectionRecord } from "@/types/collections-db";

type StockpileAddToCollectionControllerProps = {
  collections: CollectionRecord[];
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string };
  visibleSelectedIds: string[];
  onCollectionsUpdated: (next: CollectionRecord[]) => void;
};

export default function StockpileAddToCollectionController({
  collections,
  activeFilter,
  visibleSelectedIds,
  onCollectionsUpdated,
}: StockpileAddToCollectionControllerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const hasOtherCollections = useMemo(
    () =>
      collections.some(
        (collection) => activeFilter.type !== "collection" || collection.id !== activeFilter.id,
      ),
    [collections, activeFilter],
  );

  useEscapeModalAware({
    id: "stockpile-add-to-collection",
    isOpen,
    onEscape: () => setIsOpen(false),
  });

  if (!hasOtherCollections) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        disabled={!visibleSelectedIds.length}
        onClick={() => setIsOpen(true)}
      >
        {t("actions.addToCollection")}
      </button>
      <StockpileAddToCollectionModal
        isOpen={isOpen}
        collections={collections}
        activeFilter={activeFilter}
        visibleSelectedIds={visibleSelectedIds}
        onSubmit={async (collectionId, cardIds) => {
          try {
            const target = collections.find((item) => item.id === collectionId);
            if (!target) return;
            const merged = new Set<string>(target.cardIds);
            cardIds.forEach((id) => merged.add(id));
            await updateCollection(target.id, { cardIds: Array.from(merged) });
            const refreshed = await listCollections();
            onCollectionsUpdated(refreshed);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[StockpileModal] Failed to add to collection", error);
          }
        }}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
