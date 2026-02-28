"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileCollectionModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  collectionId?: string | null;
  collections: Array<{ id: string; name: string; description?: string; cardIds?: string[] }>;
  onCreate: (name: string, description?: string) => Promise<void>;
  onUpdate: (id: string, name: string, description?: string) => Promise<void>;
  onClose: () => void;
};

export default function StockpileCollectionModal({
  isOpen,
  mode,
  collectionId = null,
  collections,
  onCreate,
  onUpdate,
  onClose,
}: StockpileCollectionModalProps) {
  const { t } = useI18n();
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionNameError, setCollectionNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && collectionId) {
      const target = collections.find((item) => item.id === collectionId);
      if (target) {
        setCollectionName(target.name);
        setCollectionDescription(target.description ?? "");
      }
    } else {
      setCollectionName("");
      setCollectionDescription("");
    }
    setCollectionNameError(null);
  }, [isOpen, mode, collectionId, collections]);

  if (!isOpen) return null;

  return (
    <div className={styles.stockpileOverlayBackdrop} onClick={onClose}>
      <div className={styles.stockpileOverlayPanel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.stockpileOverlayHeader}>
          <h3 className={styles.stockpileOverlayTitle}>
            {mode === "edit" ? t("heading.editCollection") : t("heading.newCollection")}
          </h3>
          <button type="button" className={styles.modalCloseButton} onClick={onClose}>
            <span className="visually-hidden">{t("actions.close")}</span>✕
          </button>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmedName = collectionName.trim();
            if (!trimmedName) {
              setCollectionNameError(t("errors.collectionNameRequired"));
              return;
            }
            const normalized = trimmedName.toLocaleLowerCase();
            const conflict = collections.some((collection) => {
              if (mode === "edit" && collectionId) {
                if (collection.id === collectionId) return false;
              }
              return collection.name.toLocaleLowerCase() === normalized;
            });
            if (conflict) {
              setCollectionNameError(t("errors.collectionNameExists"));
              return;
            }
            setCollectionNameError(null);
            try {
              if (mode === "edit") {
                if (!collectionId) return;
                await onUpdate(
                  collectionId,
                  trimmedName,
                  collectionDescription.trim() || undefined,
                );
              } else {
                await onCreate(trimmedName, collectionDescription.trim() || undefined);
              }
              onClose();
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("[StockpileModal] Failed to save collection", error);
            }
          }}
        >
          <div className="d-flex flex-column gap-2">
            <label className="d-flex flex-column gap-1">
              <span>{t("form.collectionName")}</span>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={t("placeholders.collectionName")}
                value={collectionName}
                onChange={(event) => {
                  setCollectionName(event.target.value);
                  if (collectionNameError) {
                    setCollectionNameError(null);
                  }
                }}
                autoFocus
                required
              />
              {collectionNameError ? (
                <span className="text-danger small">{collectionNameError}</span>
              ) : null}
            </label>
            <label className="d-flex flex-column gap-1">
              <span>{t("form.collectionDescription")}</span>
              <textarea
                className="form-control form-control-sm"
                placeholder={t("placeholders.collectionDescription")}
                value={collectionDescription}
                onChange={(event) => setCollectionDescription(event.target.value)}
                rows={3}
              />
            </label>
          </div>
          <div className={styles.stockpileOverlayActions}>
            <button type="submit" className="btn btn-primary btn-sm">
              {mode === "edit" ? t("actions.save") : t("actions.create")}
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
