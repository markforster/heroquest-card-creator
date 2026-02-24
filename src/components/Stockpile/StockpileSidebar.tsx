"use client";

import { Fragment, useEffect, useMemo } from "react";
import { Folder, LibrarySquare } from "lucide-react";

import styles from "@/app/page.module.css";
import { buildCollectionsTree } from "@/components/Stockpile/collections-tree";
import { useCollectionsTreeSettings } from "@/components/Providers/CollectionsTreeSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileSidebarProps = {
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "collection"; id: string };
  onFilterChange: (
    next:
      | { type: "all" }
      | { type: "recent" }
      | { type: "unfiled" }
      | { type: "collection"; id: string },
  ) => void;
  isPairMode: boolean;
  showMissingArtworkOnly: boolean;
  collectionsWithMissingArtwork: Set<string>;
  selectedIds: string[];
  onClearSelection: () => void;
  recentCardsCount: number;
  overallCount: number;
  unfiledCount: number;
  visibleCollections: Array<{ id: string; name: string; description?: string; cardIds: string[] }>;
  collectionCounts: Map<string, number>;
  selectedCountByCollection: Map<string, number>;
};

export default function StockpileSidebar({
  activeFilter,
  onFilterChange,
  isPairMode,
  showMissingArtworkOnly,
  collectionsWithMissingArtwork,
  selectedIds,
  onClearSelection,
  recentCardsCount,
  overallCount,
  unfiledCount,
  visibleCollections,
  collectionCounts,
  selectedCountByCollection,
}: StockpileSidebarProps) {
  const { t } = useI18n();
  const {
    enabled: treeEnabled,
    expandedPaths,
    setExpandedPaths,
    togglePath,
    hasStoredExpandedPaths,
    isReady: treeSettingsReady,
  } = useCollectionsTreeSettings();

  const treeData = useMemo(() => {
    if (!treeEnabled) return null;
    return buildCollectionsTree(visibleCollections, {
      collectionCounts,
      collectionsWithMissingArtwork,
    });
  }, [treeEnabled, visibleCollections, collectionCounts, collectionsWithMissingArtwork]);

  useEffect(() => {
    if (!treeEnabled) return;
    if (!treeSettingsReady) return;
    if (hasStoredExpandedPaths) return;
    if (!treeData?.folderPathIds.length) return;
    setExpandedPaths(treeData.folderPathIds);
  }, [treeEnabled, treeSettingsReady, hasStoredExpandedPaths, treeData, setExpandedPaths]);

  const renderCollectionButton = (
    collection: { id: string; name: string; description?: string; fullName?: string },
    depth: number,
    showLeafMarker: boolean,
  ) => (
    <button
      key={collection.id}
      type="button"
      className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${
        activeFilter.type === "collection" && activeFilter.id === collection.id
          ? styles.stockpileSidebarItemActive
          : ""
      } d-flex align-items-center gap-2`}
      style={{ ["--tree-depth" as never]: depth }}
      onClick={() => {
        onFilterChange({ type: "collection", id: collection.id });
        if (!isPairMode) {
          onClearSelection();
        }
      }}
      title={collection.description || collection.fullName || collection.name}
    >
      {showLeafMarker ? (
        <LibrarySquare className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconLeaf}`} />
      ) : null}
      <span className="flex-grow-1 text-truncate fs-6">{collection.name}</span>
      {!isPairMode ? (
        <span
          className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge} ${
            showMissingArtworkOnly && collectionsWithMissingArtwork.has(collection.id)
              ? styles.stockpileCountBadgeAlert
              : ""
          }`}
        >
          {collectionCounts.get(collection.id) ?? 0}
        </span>
      ) : null}
      {isPairMode && selectedCountByCollection.get(collection.id) ? (
        <span className={styles.stockpileSelectedDot} aria-hidden="true" />
      ) : null}
    </button>
  );

  const renderTreeNodes = (nodes: ReturnType<typeof buildCollectionsTree>["nodes"], depth: number) =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isExpanded = !hasStoredExpandedPaths || expandedPaths.has(node.pathId);
        return (
          <Fragment key={`folder-${node.pathId}`}>
            <button
              type="button"
              className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${styles.stockpileTreeFolder} d-flex align-items-center gap-2`}
              style={{ ["--tree-depth" as never]: depth }}
              onClick={() => togglePath(node.pathId)}
              aria-expanded={isExpanded}
            >
              <span
                className={`${styles.stockpileTreeCaret} ${
                  isExpanded ? styles.stockpileTreeCaretExpanded : ""
                }`}
                aria-hidden="true"
              />
              <Folder className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconFolder}`} />
              <span className="flex-grow-1 text-truncate fs-6">{node.label}</span>
              {!isPairMode ? (
                <span
                  className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge} ${
                    showMissingArtworkOnly && node.hasMissingArtwork
                      ? styles.stockpileCountBadgeAlert
                      : ""
                  }`}
                >
                  {node.count}
                </span>
              ) : null}
            </button>
            {isExpanded ? renderTreeNodes(node.children, depth + 1) : null}
          </Fragment>
        );
      }

      return renderCollectionButton(
        {
          id: node.id,
          name: node.label,
          description: node.description,
          fullName: node.name,
        },
        depth,
        true,
      );
    });

  return (
    <aside
      className={`${styles.stockpileSidebar} d-flex flex-column gap-2`}
      aria-label={t("heading.collections")}
    >
      <div className={styles.stockpileSidebarHeader}>{t("heading.collections")}</div>
      <div className={styles.stockpileSidebarList}>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "recent" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "recent" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.recentCards")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {recentCardsCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "all" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "all" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.allCards")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {overallCount}
            </span>
          ) : selectedIds.length > 0 ? (
            <span className={styles.stockpileSelectedDot} aria-hidden="true" />
          ) : null}
        </button>
        <button
          type="button"
          className={`${styles.stockpileSidebarItem} ${
            activeFilter.type === "unfiled" ? styles.stockpileSidebarItemActive : ""
          } d-flex align-items-center gap-2`}
          onClick={() => {
            onFilterChange({ type: "unfiled" });
            if (!isPairMode) {
              onClearSelection();
            }
          }}
        >
          <span className="flex-grow-1 text-truncate fs-6">{t("actions.unfiled")}</span>
          {!isPairMode ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {unfiledCount}
            </span>
          ) : null}
        </button>
        <div className={styles.stockpileSidebarDivider} />
      </div>
      <div className={styles.stockpileSidebarMiddle}>
        {treeEnabled && treeData
          ? renderTreeNodes(treeData.nodes, 1)
          : visibleCollections.map((collection) => renderCollectionButton(collection, 1, false))}
      </div>
    </aside>
  );
}
