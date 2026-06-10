"use client";

import { Folder, LibrarySquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import type { CollectionRecord } from "@/api/collections";
import { useCollectionsTreeSettings } from "@/components/Providers/CollectionsTreeSettingsContext";
import {
  buildCollectionsTree,
  type CollectionLeaf,
  type FolderNode,
} from "@/components/Stockpile/collections-tree";
import { useI18n } from "@/i18n/I18nProvider";

import type { ReactNode } from "react";

type TreeNode = FolderNode | CollectionLeaf;

type CollectionsMembershipTreeProps = {
  collections: CollectionRecord[];
  membershipSet: Set<string>;
  showCounts: boolean;
  actionMode: "text" | "icon";
  expansionBehavior?: "respectStored" | "expandAll" | "expandMembershipPaths";
  collapsibleFolders?: boolean;
  expansionSessionKey?: string | number;
  onToggleMembership: (collection: CollectionRecord, shouldAdd: boolean) => void;
  disableActions?: boolean;
  allowAddWhenAbsent?: boolean;
};

const sortCollections = (collections: CollectionRecord[]) =>
  [...collections].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export default function CollectionsMembershipTree({
  collections,
  membershipSet,
  showCounts,
  actionMode,
  expansionBehavior = "respectStored",
  collapsibleFolders = true,
  expansionSessionKey,
  onToggleMembership,
  disableActions = false,
  allowAddWhenAbsent = true,
}: CollectionsMembershipTreeProps) {
  const { t } = useI18n();
  const {
    enabled: treeEnabled,
    expandedPaths,
    setExpandedPaths,
    togglePath,
    hasStoredExpandedPaths,
    isReady: treeSettingsReady,
  } = useCollectionsTreeSettings();

  const orderedCollections = useMemo(() => sortCollections(collections), [collections]);
  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orderedCollections.forEach((collection) => {
      counts.set(collection.id, collection.cardIds.length);
    });
    return counts;
  }, [orderedCollections]);

  const treeData = useMemo(() => {
    if (!treeEnabled) return null;
    return buildCollectionsTree(orderedCollections, {
      collectionCounts,
    });
  }, [collectionCounts, orderedCollections, treeEnabled]);

  const membershipAncestorPaths = useMemo(() => {
    if (!treeData?.folderPathIds.length) return [] as string[];
    const folderPathSet = new Set(treeData.folderPathIds);
    const ancestorPaths = new Set<string>();

    orderedCollections.forEach((collection) => {
      if (!membershipSet.has(collection.id)) return;
      const segments = collection.name
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean);
      if (segments.length < 2) return;
      for (let index = 0; index < segments.length - 1; index += 1) {
        const pathId = segments.slice(0, index + 1).join("/");
        if (folderPathSet.has(pathId)) {
          ancestorPaths.add(pathId);
        }
      }
    });

    return treeData.folderPathIds.filter((pathId) => ancestorPaths.has(pathId));
  }, [membershipSet, orderedCollections, treeData?.folderPathIds]);

  const initialExpandedPaths = useMemo(() => {
    if (!treeData?.folderPathIds.length) return [] as string[];
    if (expansionBehavior === "expandAll") {
      return treeData.folderPathIds;
    }
    if (expansionBehavior === "expandMembershipPaths") {
      return membershipAncestorPaths;
    }
    if (!hasStoredExpandedPaths) {
      return treeData.folderPathIds;
    }
    return treeData.folderPathIds.filter((pathId) => expandedPaths.has(pathId));
  }, [
    expandedPaths,
    expansionBehavior,
    hasStoredExpandedPaths,
    membershipAncestorPaths,
    treeData?.folderPathIds,
  ]);

  const [localExpandedPaths, setLocalExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!treeEnabled) return;
    setLocalExpandedPaths(new Set(initialExpandedPaths));
  }, [expansionSessionKey, treeEnabled]);

  useEffect(() => {
    if (!treeEnabled) return;
    if (!treeSettingsReady) return;
    if (!collapsibleFolders) return;
    if (expansionBehavior !== "respectStored") return;
    if (hasStoredExpandedPaths) return;
    if (!treeData?.folderPathIds.length) return;
    setExpandedPaths(treeData.folderPathIds);
  }, [
    collapsibleFolders,
    expansionBehavior,
    treeEnabled,
    treeSettingsReady,
    hasStoredExpandedPaths,
    treeData,
    setExpandedPaths,
  ]);

  const toggleLocalPath = (pathId: string) => {
    setLocalExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathId)) {
        next.delete(pathId);
      } else {
        next.add(pathId);
      }
      return next;
    });
  };

  const renderAction = (collection: CollectionRecord, isMember: boolean) => {
    if (!isMember && !allowAddWhenAbsent) {
      return null;
    }

    const shouldAdd = !isMember;
    const actionTitle = shouldAdd
      ? t("actions.addToCollection")
      : t("actions.removeFromCollection");

    if (actionMode === "icon") {
      const Icon = shouldAdd ? Plus : Trash2;
      return (
        <button
          type="button"
          className={
            shouldAdd
              ? `${styles.inspectorCollectionsIconActionButton} ${styles.inspectorCollectionsIconActionButtonAdd}`
              : `${styles.inspectorCollectionsIconActionButton} ${styles.inspectorCollectionsIconActionButtonRemove}`
          }
          onClick={() => onToggleMembership(collection, shouldAdd)}
          disabled={disableActions}
          aria-label={`${actionTitle}: ${collection.name}`}
          title={`${actionTitle}: ${collection.name}`}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      );
    }

    return (
      <button
        type="button"
        className={`${styles.inspectorCollectionsActionButton} ${
          shouldAdd
            ? styles.inspectorCollectionsActionButtonAdd
            : styles.inspectorCollectionsActionButtonRemove
        }`}
        onClick={() => onToggleMembership(collection, shouldAdd)}
        disabled={disableActions}
        aria-label={`${actionTitle}: ${collection.name}`}
        title={`${actionTitle}: ${collection.name}`}
      >
        {shouldAdd ? t("actions.add") : t("actions.remove")}
      </button>
    );
  };

  const renderLeaf = (
    collection: CollectionRecord,
    label: string,
    depth: number,
    showLeafMarker: boolean,
  ) => {
    const isMember = membershipSet.has(collection.id);
    const action = renderAction(collection, isMember);

    return (
      <div
        key={collection.id}
        className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${styles.inspectorCollectionsRow}`}
        style={{ ["--tree-depth" as never]: depth }}
        title={collection.description || collection.name}
      >
        <span className={styles.inspectorCollectionsRowMain}>
          {showLeafMarker ? (
            <LibrarySquare
              className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconLeaf}`}
              aria-hidden="true"
            />
          ) : null}
          <span className={`${styles.stockpileSidebarItemLabel} ${styles.inspectorCollectionsLabel}`}>
            {label}
          </span>
        </span>
        {showCounts || action ? (
          <span className={styles.stockpileSidebarItemTail}>
            {showCounts ? (
              <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
                {collection.cardIds.length}
              </span>
            ) : null}
            {action}
          </span>
        ) : null}
      </div>
    );
  };

  const renderTreeNodes = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isExpanded = collapsibleFolders
          ? localExpandedPaths.has(node.pathId)
          : expansionBehavior === "expandAll" || initialExpandedPaths.includes(node.pathId);
        const folderRow = (
          <>
            <span
              className={`${styles.stockpileTreeCaret} ${
                isExpanded ? styles.stockpileTreeCaretExpanded : ""
              }`}
              aria-hidden="true"
            />
            <Folder className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconFolder}`} />
            <span className={`${styles.stockpileSidebarItemLabel} ${styles.inspectorCollectionsLabel}`}>
              {node.label}
            </span>
          </>
        );

        return (
          <div key={`folder-${node.pathId}`} className={styles.inspectorCollectionsFolderBlock}>
            {collapsibleFolders ? (
              <button
                type="button"
                className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${styles.stockpileTreeFolder} ${styles.inspectorCollectionsFolderRow} d-flex align-items-center gap-2`}
                style={{ ["--tree-depth" as never]: depth }}
                onClick={() => {
                  if (expansionBehavior === "respectStored") {
                    togglePath(node.pathId);
                  }
                  toggleLocalPath(node.pathId);
                }}
                aria-expanded={isExpanded}
              >
                {folderRow}
              </button>
            ) : (
              <div
                className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${styles.stockpileTreeFolder} ${styles.inspectorCollectionsFolderRow} d-flex align-items-center gap-2`}
                style={{ ["--tree-depth" as never]: depth }}
                aria-expanded={isExpanded}
              >
                {folderRow}
              </div>
            )}
            {isExpanded ? renderTreeNodes(node.children, depth + 1) : null}
          </div>
        );
      }

      const collection = orderedCollections.find((entry) => entry.id === node.id);
      if (!collection) return null;
      return renderLeaf(collection, node.label, depth, true);
    });

  if (treeEnabled && treeData) {
    return <>{renderTreeNodes(treeData.nodes, 1)}</>;
  }

  return (
    <>
      {orderedCollections.map((collection) =>
        renderLeaf(collection, collection.name, 1, false),
      )}
    </>
  );
}
