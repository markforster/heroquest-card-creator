"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import type { CollectionRecord } from "@/api/collections";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { useI18n } from "@/i18n/I18nProvider";

import CollectionsMembershipTree from "./CollectionsMembershipTree";

type CollectionsMembershipModalProps = {
  isOpen: boolean;
  collections: CollectionRecord[];
  initialMembershipIds: Set<string>;
  onClose: () => void;
  onConfirm: (nextMembershipIds: Set<string>) => Promise<void>;
};

export default function CollectionsMembershipModal({
  isOpen,
  collections,
  initialMembershipIds,
  onClose,
  onConfirm,
}: CollectionsMembershipModalProps) {
  const { t } = useI18n();
  const [draftMembershipIds, setDraftMembershipIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [expansionSessionKey, setExpansionSessionKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setDraftMembershipIds(new Set(initialMembershipIds));
    setIsSaving(false);
    setExpansionSessionKey((previous) => previous + 1);
  }, [initialMembershipIds, isOpen]);

  useEscapeModalAware({
    id: "collections-membership-modal",
    isOpen,
    onEscape: () => {
      if (!isSaving) {
        onClose();
      }
    },
  });

  const hasChanges = useMemo(() => {
    if (draftMembershipIds.size !== initialMembershipIds.size) return true;
    for (const collectionId of draftMembershipIds) {
      if (!initialMembershipIds.has(collectionId)) return true;
    }
    return false;
  }, [draftMembershipIds, initialMembershipIds]);

  if (!isOpen) return null;

  return (
    <div className={styles.stockpileOverlayBackdrop} onClick={() => !isSaving && onClose()}>
      <div
        className={`${styles.stockpileOverlayPanel} ${styles.inspectorCollectionsModalPanel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.stockpileOverlayHeader}>
          <h3 className={styles.stockpileOverlayTitle}>{t("heading.addToCollections")}</h3>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            disabled={isSaving}
          >
            <span className="visually-hidden">{t("actions.close")}</span>✕
          </button>
        </div>
        <div className={styles.inspectorCollectionsModalBody} data-testid="collections-membership-modal">
          <CollectionsMembershipTree
            collections={collections}
            membershipSet={draftMembershipIds}
            showCounts={false}
            actionMode="icon"
            expansionBehavior="expandMembershipPaths"
            collapsibleFolders
            expansionSessionKey={expansionSessionKey}
            disableActions={isSaving}
            onToggleMembership={(collection, shouldAdd) => {
              setDraftMembershipIds((prev) => {
                const next = new Set(prev);
                if (shouldAdd) {
                  next.add(collection.id);
                } else {
                  next.delete(collection.id);
                }
                return next;
              });
            }}
          />
        </div>
        <div className={styles.stockpileOverlayActions}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isSaving || !hasChanges}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onConfirm(new Set(draftMembershipIds));
                onClose();
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {t("actions.confirm")}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("actions.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
