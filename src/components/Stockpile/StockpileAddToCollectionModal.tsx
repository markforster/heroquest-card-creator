"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import CollectionsFilterSelect, {
  type CollectionsFilterValue,
} from "@/components/common/CollectionsFilterSelect";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileAddToCollectionModalProps = {
  isOpen: boolean;
  collections: Array<{ id: string; name: string; description?: string; cardIds?: string[] }>;
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string };
  visibleSelectedIds: string[];
  onSubmit: (collectionId: string, cardIds: string[]) => Promise<void>;
  onClose: () => void;
};

export default function StockpileAddToCollectionModal({
  isOpen,
  collections,
  activeFilter,
  visibleSelectedIds,
  onSubmit,
  onClose,
}: StockpileAddToCollectionModalProps) {
  const { t } = useI18n();
  const [addTargetCollectionId, setAddTargetCollectionId] = useState("");
  const availableCollections = useMemo(
    () =>
      collections.filter(
        (collection) => activeFilter.type !== "collection" || collection.id !== activeFilter.id,
      ),
    [collections, activeFilter],
  );
  const selectedValue = useMemo<CollectionsFilterValue | null>(
    () => (addTargetCollectionId ? { type: "collection", id: addTargetCollectionId } : null),
    [addTargetCollectionId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setAddTargetCollectionId("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.stockpileOverlayBackdrop} onClick={onClose}>
      <div className={styles.stockpileOverlayPanel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.stockpileOverlayHeader}>
          <h3 className={styles.stockpileOverlayTitle}>{t("heading.addToCollection")}</h3>
          <button type="button" className={styles.modalCloseButton} onClick={onClose}>
            <span className="visually-hidden">{t("actions.close")}</span>✕
          </button>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!addTargetCollectionId) return;
            await onSubmit(addTargetCollectionId, visibleSelectedIds);
            onClose();
          }}
        >
          <label className="d-block w-100">
            <span className="visually-hidden">{t("form.targetCollection")}</span>
            <CollectionsFilterSelect
              inputId="stockpile-add-to-collection-select"
              ariaLabel={t("form.targetCollection")}
              selectedValue={selectedValue}
              onValueChange={(next) => {
                if (next.type !== "collection") return;
                setAddTargetCollectionId(next.id);
              }}
              collections={availableCollections}
              includeSystemFilters={false}
              showCounts={false}
              allowEmptySelection
              placeholder="Select a collection"
            />
          </label>
          <div className={styles.stockpileOverlayActions}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!addTargetCollectionId}
            >
              {t("actions.add")}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              {t("actions.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
