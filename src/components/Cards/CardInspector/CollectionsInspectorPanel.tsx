"use client";

import { CircleAlert, FolderPlus, Info, LoaderCircle, SquareStack } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import styles from "@/app/page.module.css";
import type { CollectionRecord } from "@/api/collections";
import { apiClient } from "@/api/client";
import { invalidateCollectionsQueries } from "@/api/queryInvalidation";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import CollectionsMembershipModal from "./CollectionsMembershipModal";
import CollectionsMembershipTree from "./CollectionsMembershipTree";
import InspectorPanelHeader from "./InspectorPanelHeader";
import InspectorStateNotice from "./InspectorStateNotice";

const sortCollections = (collections: CollectionRecord[]) =>
  [...collections].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export default function CollectionsInspectorPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
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
      await Promise.all([refreshCollections(), invalidateCollectionsQueries(queryClient)]);
    } catch {
      // Keep the current list visible if an update fails.
    } finally {
      setUpdatingCollectionId(null);
    }
  };

  if (!savedCardId) {
    return (
      <InspectorStateNotice
        variant="prerequisite"
        icon={<Info size={18} aria-hidden="true" />}
        title={t("empty.saveCardToManageCollectionsTitle")}
        body={t("empty.saveCardToManageCollectionsBody")}
        hint={t("empty.saveCardToManageCollectionsHint")}
      />
    );
  }

  if (isLoading) {
    return (
      <InspectorStateNotice
        variant="loading"
        icon={<LoaderCircle size={18} aria-hidden="true" />}
        title={t("status.loadingCollections")}
        body={t("status.loadingCollectionsBody")}
      />
    );
  }

  if (loadError) {
    return (
      <InspectorStateNotice
        variant="error"
        icon={<CircleAlert size={18} aria-hidden="true" />}
        title={t("error.failedToLoadCollections")}
        body={t("error.failedToLoadCollectionsBody")}
        role="alert"
      />
    );
  }

  return (
    <div className={styles.inspectorCollectionsPanel}>
      <InspectorPanelHeader
        reserveTitleSpace
        actions={
          <button
            type="button"
            className={styles.inspectorPanelHeaderActionButton}
            onClick={() => setIsModalOpen(true)}
            aria-label={t("actions.addToCollection")}
            title={t("actions.addToCollection")}
          >
            <FolderPlus size={18} aria-hidden="true" />
          </button>
        }
      />
      {memberCollections.length === 0 ? (
        <InspectorStateNotice
          icon={<SquareStack size={18} aria-hidden="true" />}
          title={t("empty.cardNotInCollectionsTitle")}
          body={t("empty.cardNotInCollectionsBody")}
          hint={t("empty.cardNotInCollectionsHint")}
        />
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

          await Promise.all([refreshCollections(), invalidateCollectionsQueries(queryClient)]);
        }}
      />
    </div>
  );
}
