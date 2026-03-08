"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  Folder,
  FolderDown,
  FolderUp,
  LibrarySquare,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef } from "react";

import styles from "@/app/page.module.css";
import { useCollectionsTreeSettings } from "@/components/Providers/CollectionsTreeSettingsContext";
import { buildCollectionsTree } from "@/components/Stockpile/collections-tree";
import { useI18n } from "@/i18n/I18nProvider";

import type { ReactNode } from "react";

type StockpileSidebarProps = {
  headerActions?: ReactNode;
  footerActions?: ReactNode;
  onRequestClose?: () => void;
  onEditCollection?: (collectionId: string) => void;
  onDeleteCollection?: (collectionId: string) => void;
  isManagingCollections?: boolean;
  dragEnabled: boolean;
  activeFilter:
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string };
  onFilterChange: (
    next:
      | { type: "all" }
      | { type: "recent" }
      | { type: "unfiled" }
      | { type: "recentlyDeleted" }
      | { type: "collection"; id: string },
  ) => void;
  isPairMode: boolean;
  showMissingArtworkOnly: boolean;
  collectionsWithMissingArtwork: Set<string>;
  selectedIds: string[];
  onClearSelection: () => void;
  recentCardsCount: number;
  recentlyDeletedCount: number;
  recentlyDeletedTotalCount: number;
  overallCount: number;
  unfiledCount: number;
  visibleCollections: Array<{ id: string; name: string; description?: string; cardIds: string[] }>;
  collectionCounts: Map<string, number>;
  selectedCountByCollection: Map<string, number>;
};

export default function StockpileSidebar({
  headerActions,
  footerActions,
  onRequestClose,
  onEditCollection,
  onDeleteCollection,
  isManagingCollections = false,
  dragEnabled,
  activeFilter,
  onFilterChange,
  isPairMode,
  showMissingArtworkOnly,
  collectionsWithMissingArtwork,
  selectedIds,
  onClearSelection,
  recentCardsCount,
  recentlyDeletedCount,
  recentlyDeletedTotalCount,
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
  const expandedBeforeManageRef = useRef<Set<string> | null>(null);
  const wasManagingRef = useRef(false);
  const listScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);

  const treeData = useMemo(() => {
    if (!treeEnabled) return null;
    return buildCollectionsTree(visibleCollections, {
      collectionCounts,
      collectionsWithMissingArtwork,
    });
  }, [treeEnabled, visibleCollections, collectionCounts, collectionsWithMissingArtwork]);

  const contextFolderPathIds = useMemo(() => {
    if (!treeEnabled) return [] as string[];
    if (!treeData?.folderPathIds.length) return [] as string[];
    if (activeFilter.type !== "collection") return [] as string[];
    const targetCollectionId = activeFilter.id;

    type TreeNode = ReturnType<typeof buildCollectionsTree>["nodes"][number];
    type FolderNode = Extract<TreeNode, { type: "folder" }>;
    type LeafNode = Extract<TreeNode, { type: "leaf" }>;

    const findAncestorFolders = (
      nodes: TreeNode[],
      ancestors: string[],
    ): string[] | null => {
      for (const node of nodes) {
        if (node.type === "leaf") {
          const leaf = node as LeafNode;
          if (leaf.id === targetCollectionId) {
            return ancestors;
          }
          continue;
        }
        const folder = node as FolderNode;
        const nextAncestors = folder.pathId ? [...ancestors, folder.pathId] : ancestors;
        const found = findAncestorFolders(folder.children as TreeNode[], nextAncestors);
        if (found) return found;
      }
      return null;
    };

    const found = treeData.nodes.length
      ? findAncestorFolders(treeData.nodes as TreeNode[], [])
      : null;
    if (found) return found;

    // Fallback: derive folder paths from the name segments if the tree traversal fails.
    const collection = visibleCollections.find((item) => item.id === targetCollectionId);
    if (!collection) return [];
    const segments = collection.name
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length < 2) return [];
    const folderPathSet = new Set(treeData.folderPathIds);
    const paths: string[] = [];
    for (let i = 0; i < segments.length - 1; i += 1) {
      const pathId = segments.slice(0, i + 1).join("/");
      if (folderPathSet.has(pathId)) {
        paths.push(pathId);
      }
    }
    return paths;
  }, [activeFilter, treeData?.folderPathIds, treeEnabled, visibleCollections]);

  useEffect(() => {
    if (!treeEnabled) return;
    if (!treeSettingsReady) return;
    if (hasStoredExpandedPaths) return;
    if (!treeData?.folderPathIds.length) return;
    setExpandedPaths(treeData.folderPathIds);
  }, [treeEnabled, treeSettingsReady, hasStoredExpandedPaths, treeData, setExpandedPaths]);

  useEffect(() => {
    if (!treeEnabled) return;
    if (!treeSettingsReady) return;
    if (!treeData?.folderPathIds.length) return;

    const container = listScrollContainerRef.current;
    const captureScroll = () => {
      if (!container) return;
      pendingScrollTopRef.current = container.scrollTop;
    };

    if (isManagingCollections && !wasManagingRef.current) {
      wasManagingRef.current = true;
      expandedBeforeManageRef.current = new Set(expandedPaths);
      captureScroll();
      setExpandedPaths(treeData.folderPathIds);
    } else if (!isManagingCollections && wasManagingRef.current) {
      wasManagingRef.current = false;
      const restore = expandedBeforeManageRef.current;
      expandedBeforeManageRef.current = null;
      if (restore) {
        captureScroll();
        setExpandedPaths(restore);
      }
    }
  }, [
    expandedPaths,
    isManagingCollections,
    setExpandedPaths,
    treeData?.folderPathIds,
    treeEnabled,
    treeSettingsReady,
  ]);

  useEffect(() => {
    if (!treeEnabled) return;
    if (!treeSettingsReady) return;
    if (!listScrollContainerRef.current) return;

    const container = listScrollContainerRef.current;
    const activeCollectionId = activeFilter.type === "collection" ? activeFilter.id : null;

    const escapeSelector = (value: string) => {
      const escapeFn =
        typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape : null;
      if (escapeFn) return escapeFn(value);
      return value.replace(/["\\]/g, "\\$&");
    };

    const scrollIntoView = () => {
      if (pendingScrollTopRef.current != null) {
        container.scrollTop = pendingScrollTopRef.current;
        pendingScrollTopRef.current = null;
      }
      if (!activeCollectionId) return;
      const node = container.querySelector(
        `[data-collection-id="${escapeSelector(activeCollectionId)}"]`,
      ) as HTMLElement | null;
      node?.scrollIntoView({ block: "nearest" });
    };

    if (typeof window.requestAnimationFrame !== "function") {
      scrollIntoView();
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollIntoView);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeFilter, expandedPaths, isManagingCollections, treeEnabled, treeSettingsReady]);

  const CollectionItem = ({
    collection,
    depth,
    showLeafMarker,
  }: {
    collection: { id: string; name: string; description?: string; fullName?: string };
    depth: number;
    showLeafMarker: boolean;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `collection:${collection.id}`,
      disabled: !dragEnabled || isManagingCollections,
    });
    return (
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        data-collection-id={collection.id}
        className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${
          activeFilter.type === "collection" && activeFilter.id === collection.id
            ? styles.stockpileSidebarItemActive
            : ""
        } ${isOver ? styles.stockpileSidebarItemDropOver : ""} d-flex align-items-center gap-2`}
        style={{ ["--tree-depth" as never]: depth }}
        onClick={() => {
          onFilterChange({ type: "collection", id: collection.id });
          if (!isPairMode) {
            onClearSelection();
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onFilterChange({ type: "collection", id: collection.id });
          if (!isPairMode) {
            onClearSelection();
          }
        }}
        title={collection.description || collection.fullName || collection.name}
      >
        {showLeafMarker ? (
          <LibrarySquare
            className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconLeaf}`}
          />
        ) : null}
        <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
          {collection.name}
        </span>
        <div className={styles.stockpileSidebarItemTail}>
          {!isPairMode && !isManagingCollections ? (
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
          {!isPairMode &&
          isManagingCollections &&
          onEditCollection &&
          onDeleteCollection ? (
            <div className={styles.stockpileSidebarItemActions}>
              <button
                type="button"
                className={`${styles.stockpileSidebarItemActionButton} ${styles.stockpileSidebarItemActionButtonEdit}`}
                title={t("actions.editCollection")}
                aria-label={t("actions.editCollection")}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditCollection(collection.id);
                }}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.stockpileSidebarItemActionButton} ${styles.stockpileSidebarItemActionButtonDelete}`}
                title={t("actions.delete")}
                aria-label={t("actions.delete")}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteCollection(collection.id);
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCollectionButton = (
    collection: { id: string; name: string; description?: string; fullName?: string },
    depth: number,
    showLeafMarker: boolean,
  ) => (
    <CollectionItem
      key={collection.id}
      collection={collection}
      depth={depth}
      showLeafMarker={showLeafMarker}
    />
  );

  const renderTreeNodes = (nodes: ReturnType<typeof buildCollectionsTree>["nodes"], depth: number) =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isExpanded =
          isManagingCollections || !hasStoredExpandedPaths || expandedPaths.has(node.pathId);
        return (
          <Fragment key={`folder-${node.pathId}`}>
            <button
              type="button"
              className={`${styles.stockpileSidebarItem} ${styles.stockpileTreeItem} ${styles.stockpileTreeFolder} d-flex align-items-center gap-2`}
              style={{ ["--tree-depth" as never]: depth }}
              onClick={() => {
                if (isManagingCollections) return;
                togglePath(node.pathId);
              }}
              aria-expanded={isExpanded}
            >
              <span
                className={`${styles.stockpileTreeCaret} ${
                  isExpanded ? styles.stockpileTreeCaretExpanded : ""
                }`}
                aria-hidden="true"
              />
              <Folder className={`${styles.stockpileTreeIcon} ${styles.stockpileTreeIconFolder}`} />
              <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
                {node.label}
              </span>
              {!isPairMode && !isManagingCollections ? (
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
      className={`${styles.stockpileSidebar} ${
        isManagingCollections ? styles.stockpileSidebarManaging : ""
      } d-flex flex-column gap-2`}
      aria-label={t("heading.collections")}
    >
      <div className={styles.stockpileSidebarHeaderRow}>
        <div className={styles.stockpileSidebarHeaderActions}>
          {headerActions ?? null}
          {onRequestClose ? (
            <button
              type="button"
              className={styles.stockpileSidebarCloseButton}
              onClick={onRequestClose}
              title={t("actions.close")}
              aria-label={t("actions.close")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
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
          <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
            {t("actions.recentCards")}
          </span>
          {!isPairMode && !isManagingCollections ? (
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
          <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
            {t("actions.allCards")}
          </span>
          {!isPairMode && !isManagingCollections ? (
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
          <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
            {t("actions.unfiled")}
          </span>
          {!isPairMode && !isManagingCollections ? (
            <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
              {unfiledCount}
            </span>
          ) : null}
        </button>
        {!isPairMode && recentlyDeletedTotalCount > 0 ? (
          <button
            type="button"
            className={`${styles.stockpileSidebarItem} ${
              activeFilter.type === "recentlyDeleted" ? styles.stockpileSidebarItemActive : ""
            } d-flex align-items-center gap-2`}
            onClick={() => {
              onFilterChange({ type: "recentlyDeleted" });
              onClearSelection();
            }}
          >
            <span className={`${styles.stockpileSidebarItemLabel} flex-grow-1 text-truncate fs-6`}>
              {t("actions.recentlyDeleted")}
            </span>
            {!isManagingCollections ? (
              <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
                {recentlyDeletedCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <div className={styles.stockpileSidebarDivider} />
      </div>
      <div className={styles.stockpileSidebarMiddle} ref={listScrollContainerRef}>
        {treeEnabled && treeData
          ? renderTreeNodes(treeData.nodes, 1)
          : visibleCollections.map((collection) => renderCollectionButton(collection, 1, false))}
      </div>
      {(() => {
        const showTreeFooterControls =
          !isPairMode &&
          !isManagingCollections &&
          treeEnabled &&
          Boolean(treeData?.folderPathIds.length);
        const showFooterToolbar = showTreeFooterControls || Boolean(footerActions);
        if (!showFooterToolbar) return null;

        const collapseLabel = t("actions.collapseAll");
        const expandLabel = t("actions.expandAll");
        const folderPathIds = treeData?.folderPathIds ?? [];
        const allExpanded =
          folderPathIds.length > 0 && folderPathIds.every((pathId) => expandedPaths.has(pathId));
        const contextExpanded =
          contextFolderPathIds.length > 0 &&
          expandedPaths.size === contextFolderPathIds.length &&
          contextFolderPathIds.every((pathId) => expandedPaths.has(pathId));
        const noneExpanded = expandedPaths.size === 0 || contextExpanded;

        return (
          <div className={styles.stockpileSidebarBottomToolbar}>
            <div className={styles.stockpileSidebarBottomLeft}>
              {showTreeFooterControls ? (
                <>
                  <button
                    type="button"
                    className={`${styles.stockpileCollectionsFooterButton} ${
                      noneExpanded
                        ? styles.stockpileCollectionsFooterButtonActive
                        : ""
                    }`}
                    title={collapseLabel}
                    aria-label={collapseLabel}
                    aria-pressed={noneExpanded}
                    onClick={() => setExpandedPaths(contextFolderPathIds)}
                  >
                    <FolderUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.stockpileCollectionsFooterButton} ${
                      allExpanded ? styles.stockpileCollectionsFooterButtonActive : ""
                    }`}
                    title={expandLabel}
                    aria-label={expandLabel}
                    aria-pressed={allExpanded}
                    onClick={() => setExpandedPaths(folderPathIds)}
                  >
                    <FolderDown size={18} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex-grow-1" />
            <div className={styles.stockpileSidebarBottomRight}>{footerActions ?? null}</div>
          </div>
        );
      })()}
    </aside>
  );
}
