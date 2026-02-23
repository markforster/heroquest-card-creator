"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import StockpileCollectionModal from "@/components/Stockpile/StockpileCollectionModal";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { createCollection, deleteCollection, listCollections, updateCollection } from "@/lib/collections-db";
import type { CollectionRecord } from "@/types/collections-db";

type StockpileCollectionControllerProps = {
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "collection"; id: string };
  collections: CollectionRecord[];
  onCollectionsUpdated: (next: CollectionRecord[]) => void;
  onActiveFilterChange: (
    next:
      | { type: "all" }
      | { type: "recent" }
      | { type: "unfiled" }
      | { type: "collection"; id: string },
  ) => void;
};

export default function StockpileCollectionController({
  activeFilter,
  collections,
  onCollectionsUpdated,
  onActiveFilterChange,
}: StockpileCollectionControllerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const canEdit = useMemo(
    () =>
      activeFilter.type === "collection" &&
      collections.some((collection) => collection.id === activeFilter.id),
    [activeFilter, collections],
  );

  useEscapeModalAware({
    id: "stockpile-collection-editor",
    isOpen,
    onEscape: () => setIsOpen(false),
  });

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        onClick={() => {
          setMode("create");
          setIsOpen(true);
        }}
      >
        + {t("actions.newCollection")}
      </button>
      {canEdit ? (
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={() => {
            setMode("edit");
            setIsOpen(true);
          }}
        >
          {t("actions.editCollection")}
        </button>
      ) : null}
      <StockpileCollectionModal
        isOpen={isOpen}
        mode={mode}
        activeFilter={activeFilter}
        collections={collections}
        onCreate={async (name, description) => {
          try {
            const created = await createCollection({ name, description });
            onActiveFilterChange({ type: "collection", id: created.id });
            const refreshed = await listCollections();
            onCollectionsUpdated(refreshed);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[StockpileModal] Failed to create collection", error);
          }
        }}
        onUpdate={async (id, name, description) => {
          try {
            await updateCollection(id, { name, description });
            const refreshed = await listCollections();
            onCollectionsUpdated(refreshed);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[StockpileModal] Failed to update collection", error);
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteCollection(id);
            const refreshed = await listCollections();
            onCollectionsUpdated(refreshed);
            onActiveFilterChange({ type: "all" });
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("hqcc.selectedCollectionId");
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[StockpileModal] Failed to delete collection", error);
          }
        }}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
