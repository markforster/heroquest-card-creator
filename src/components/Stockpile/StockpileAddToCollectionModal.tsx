"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileAddToCollectionModalProps = {
  isOpen: boolean;
  collections: Array<{ id: string; name: string }>;
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
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

  useEffect(() => {
    if (!isOpen) return;
    const available = collections.filter(
      (collection) => activeFilter.type !== "collection" || collection.id !== activeFilter.id,
    );
    setAddTargetCollectionId(available[0]?.id ?? "");
  }, [isOpen, collections, activeFilter]);

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
          <label>
            <span className="visually-hidden">{t("form.targetCollection")}</span>
            <select
              className="form-select form-select-sm"
              value={addTargetCollectionId}
              onChange={(event) => setAddTargetCollectionId(event.target.value)}
              required
            >
              {collections
                .filter(
                  (collection) =>
                    activeFilter.type !== "collection" || collection.id !== activeFilter.id,
                )
                .map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
            </select>
          </label>
          <div className={styles.stockpileOverlayActions}>
            <button type="submit" className="btn btn-primary btn-sm">
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
