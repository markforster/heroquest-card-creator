"use client";

import { FolderPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import type { CollectionRecord } from "@/api/collections";
import { apiClient } from "@/api/client";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import CollectionsMembershipModal from "./CollectionsMembershipModal";
import CollectionsMembershipTree from "./CollectionsMembershipTree";

const sortCollections = (collections: CollectionRecord[]) =>
  [...collections].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export default function CollectionsInspectorPanel() {
  const { t } = useI18n();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate, activeCardStatusByTemplate },
  } = useCardEditor();

  const activeCardId = selectedTemplateId ? activeCardIdByTemplate[selectedTemplateId] : undefined;
  const activeCardStatus = selectedTemplateId
    ? activeCardStatusByTemplate[selectedTemplateId]
    : undefined;
  const savedCardId = activeCardId && activeCardStatus === "saved" ? activeCardId : null;

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [updatingCollectionId, setUpdatingCollectionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCollections = async () => {
      if (!savedCardId) {
        setCollections([]);
        setIsLoading(false);
        setLoadError(false);
        return;
      }

      setIsLoading(true);
      setLoadError(false);
      try {
        const data = await apiClient.listCollections();
        if (cancelled) return;
        setCollections(sortCollections(data));
      } catch {
        if (cancelled) return;
        setCollections([]);
        setLoadError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCollections();

    return () => {
      cancelled = true;
    };
  }, [savedCardId]);

  const membershipSet = useMemo(() => {
    if (!savedCardId) return new Set<string>();
    const next = new Set<string>();
    collections.forEach((collection) => {
      if (collection.cardIds.includes(savedCardId)) {
        next.add(collection.id);
      }
    });
    return next;
  }, [collections, savedCardId]);

  const memberCollections = useMemo(
    () => collections.filter((collection) => membershipSet.has(collection.id)),
    [collections, membershipSet],
  );

  const refreshCollections = async () => {
    const refreshed = await apiClient.listCollections();
    setCollections(sortCollections(refreshed));
  };

  const handleImmediateRemove = async (collection: CollectionRecord) => {
    if (!savedCardId) return;
    setUpdatingCollectionId(collection.id);
    const nextCardIds = collection.cardIds.filter((cardId) => cardId !== savedCardId);

    try {
      await apiClient.updateCollection(
        { cardIds: nextCardIds },
        { params: { id: collection.id } },
      );
      await refreshCollections();
    } catch {
      // Keep the current list visible if an update fails.
    } finally {
      setUpdatingCollectionId(null);
    }
  };

  if (!savedCardId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.saveCardToManageCollections")}</div>;
  }

  if (isLoading) {
    return <div className={styles.inspectorModeEmpty}>{t("status.loadingCollections")}</div>;
  }

  if (loadError) {
    return <div className={styles.inspectorModeEmpty}>{t("error.failedToLoadCollections")}</div>;
  }

  return (
    <div className={styles.inspectorCollectionsPanel}>
      <div className={styles.inspectorPairRow}>
        <div className={styles.inspectorPairTitle}>{t("heading.collectionsForCard")}</div>
        <div className={`${styles.inspectorPairActions} ${styles.uRowSm}`}>
          <button
            type="button"
            className={styles.stockpileCollectionsFooterButton}
            onClick={() => setIsModalOpen(true)}
            aria-label={t("actions.addToCollection")}
            title={t("actions.addToCollection")}
          >
            <FolderPlus size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {memberCollections.length === 0 ? (
        <div className={styles.inspectorModeEmpty}>{t("empty.cardNotInCollections")}</div>
      ) : (
        <div className={styles.inspectorCollectionsList} data-testid="collections-inspector-list">
          <CollectionsMembershipTree
            collections={memberCollections}
            membershipSet={membershipSet}
            showCounts={false}
            actionMode="icon"
            expansionBehavior="expandAll"
            collapsibleFolders={false}
            disableActions={updatingCollectionId != null}
            allowAddWhenAbsent={false}
            onToggleMembership={(collection) => void handleImmediateRemove(collection)}
          />
        </div>
      )}
      <CollectionsMembershipModal
        isOpen={isModalOpen}
        collections={collections}
        initialMembershipIds={membershipSet}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async (nextMembershipIds) => {
          if (!savedCardId) return;

          const updates = collections.filter((collection) => {
            const wasMember = membershipSet.has(collection.id);
            const isMember = nextMembershipIds.has(collection.id);
            return wasMember !== isMember;
          });

          for (const collection of updates) {
            const shouldInclude = nextMembershipIds.has(collection.id);
            const nextCardIds = shouldInclude
              ? collection.cardIds.includes(savedCardId)
                ? collection.cardIds
                : [...collection.cardIds, savedCardId]
              : collection.cardIds.filter((cardId) => cardId !== savedCardId);
            await apiClient.updateCollection(
              { cardIds: nextCardIds },
              { params: { id: collection.id } },
            );
          }

          await refreshCollections();
        }}
      />
    </div>
  );
}
