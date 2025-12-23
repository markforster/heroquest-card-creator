"use client";

import { Search } from "lucide-react";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import CardPreview, { type CardPreviewHandle } from "@/components/CardPreview";
import ModalShell from "@/components/ModalShell";
import { cardTemplatesById } from "@/data/card-templates";
import { deleteCards, listCards } from "@/lib/cards-db";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "@/lib/collections-db";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

type StockpileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
};

export default function StockpileModal({
  isOpen,
  onClose,
  onLoadCard,
  refreshToken,
  activeCardId,
}: StockpileModalProps) {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    | { type: "all" }
    | { type: "unfiled" }
    | { type: "collection"; id: string }
  >({ type: "all" });
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionFormMode, setCollectionFormMode] = useState<"create" | "edit">("create");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTargetCollectionId, setAddTargetCollectionId] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [storedCollectionId, setStoredCollectionId] = useState<string | null>(null);
  const [collectionNameError, setCollectionNameError] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCancelled, setExportCancelled] = useState(false);
  const previewRef = useRef<CardPreviewHandle | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const cancelExportRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    listCards({ status: "saved" })
      .then((results) => {
        if (!cancelled) {
          setCards(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCards([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshToken]);

  useEffect(() => {
    if (!collections.length || !storedCollectionId) {
      return;
    }

    const exists = collections.some((collection) => collection.id === storedCollectionId);
    if (exists) {
      setActiveFilter({ type: "collection", id: storedCollectionId });
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("hqcc.selectedCollectionId");
    }
    setStoredCollectionId(null);
  }, [collections, storedCollectionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeFilter.type === "collection") {
      window.localStorage.setItem("hqcc.selectedCollectionId", activeFilter.id);
      setStoredCollectionId(activeFilter.id);
      return;
    }

    window.localStorage.removeItem("hqcc.selectedCollectionId");
    setStoredCollectionId(null);
  }, [activeFilter]);

  useEffect(() => {
    if (!isOpen) return;

    setIsCollectionModalOpen(false);
    setCollectionName("");
    setCollectionDescription("");
    if (typeof window !== "undefined") {
      setStoredCollectionId(window.localStorage.getItem("hqcc.selectedCollectionId"));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    listCollections()
      .then((results) => {
        if (!cancelled) {
          setCollections(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshToken]);

  const { filteredCards, collectionCounts, unfiledCount, typeCounts, totalCount } = useMemo(() => {
    let base = cards;

    if (search.trim()) {
      const q = search.toLocaleLowerCase();
      base = base.filter((card) => card.nameLower.includes(q));
    }

    if (activeFilter.type === "collection") {
      const collection = collections.find((item) => item.id === activeFilter.id);
      if (!collection) {
        return {
          filteredCards: base,
          collectionCounts: new Map<string, number>(),
          unfiledCount: 0,
          typeCounts: new Map<string, number>(),
          totalCount: base.length,
        };
      }
      const allowed = new Set(collection.cardIds);
      base = base.filter((card) => allowed.has(card.id));
    }

    if (activeFilter.type === "unfiled") {
      const membershipIndex = new Map<string, number>();
      collections.forEach((collection) => {
        collection.cardIds.forEach((cardId) => {
          membershipIndex.set(cardId, (membershipIndex.get(cardId) ?? 0) + 1);
        });
      });
      base = base.filter((card) => !membershipIndex.has(card.id));
    }

    const cardIdSet = new Set(cards.map((card) => card.id));
    const counts = new Map<string, number>();
    const membershipIndex = new Map<string, number>();

    collections.forEach((collection) => {
      let count = 0;
      collection.cardIds.forEach((cardId) => {
        if (cardIdSet.has(cardId)) {
          count += 1;
          membershipIndex.set(cardId, (membershipIndex.get(cardId) ?? 0) + 1);
        }
      });
      counts.set(collection.id, count);
    });

    const unfiled = cards.reduce((total, card) => {
      return membershipIndex.has(card.id) ? total : total + 1;
    }, 0);

    const templateCounts = new Map<string, number>();
    base.forEach((card) => {
      templateCounts.set(card.templateId, (templateCounts.get(card.templateId) ?? 0) + 1);
    });

    let filtered = base;
    if (templateFilter !== "all") {
      filtered = filtered.filter((card) => card.templateId === templateFilter);
    }

    return {
      filteredCards: filtered,
      collectionCounts: counts,
      unfiledCount: unfiled,
      typeCounts: templateCounts,
      totalCount: base.length,
    };
  }, [cards, search, templateFilter, activeFilter, collections]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => (prev.length ? prev : activeCardId ? [activeCardId] : []));
  }, [isOpen, activeCardId]);

  const selectedCard =
    selectedIds.length === 1 ? cards.find((card) => card.id === selectedIds[0]) : undefined;
  const visibleSelectedIds = useMemo(() => {
    if (!filteredCards.length || !selectedIds.length) return [];
    const visibleIds = new Set(filteredCards.map((card) => card.id));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [filteredCards, selectedIds]);
  const hasMultiSelection = selectedIds.length > 1;
  const templateFilterLabelMap: Record<string, string> = {
    hero: "Hero",
    monster: "Monster",
    "large-treasure": "Large treasure",
    "small-treasure": "Small treasure",
    "hero-back": "Hero back",
    "labelled-back": "Labelled back",
  };
  const exportTemplate =
    exportTarget && cardTemplatesById[exportTarget.templateId]
      ? cardTemplatesById[exportTarget.templateId]
      : null;
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget) : undefined;
  const selectedCards = cards.filter((card) => selectedIds.includes(card.id));
  const activeCollection =
    activeFilter.type === "collection"
      ? collections.find((collection) => collection.id === activeFilter.id)
      : null;
  const activeCollectionCards = activeCollection
    ? cards.filter((card) => activeCollection.cardIds.includes(card.id))
    : [];
  const exportCards =
    activeFilter.type === "collection" && selectedCards.length === 0
      ? activeCollectionCards
      : selectedCards;
  const canExport =
    !isExporting &&
    exportCards.length > 0 &&
    (activeFilter.type === "collection" ||
      ((activeFilter.type === "all" || activeFilter.type === "unfiled") &&
        selectedIds.length > 0));
  const exportCount = exportCards.length;
  const exportLabel = isExporting
    ? "Exporting…"
    : activeFilter.type === "collection" && selectedCards.length === 0
      ? "Export all from this collection"
      : activeFilter.type === "collection"
        ? `Export (${exportCount}) from this collection`
        : `Export (${exportCount})`;
  const exportCollectionName = activeCollection?.name;
  const exportPercent =
    exportTotal > 0 ? Math.round((exportProgress / exportTotal) * 100) : 0;
  const exportTitle = exportCollectionName
    ? `Exporting (${exportTotal}) images from ${exportCollectionName}`
    : `Exporting (${exportTotal}) images`;

  useEffect(() => {
    const checkbox = selectAllRef.current;
    if (!checkbox) return;
    if (filteredCards.length === 0) {
      checkbox.indeterminate = false;
      checkbox.checked = false;
      return;
    }
    const visibleIds = new Set(filteredCards.map((card) => card.id));
    const selectedVisible = selectedIds.filter((id) => visibleIds.has(id)).length;
    checkbox.checked = selectedVisible === visibleIds.size;
    checkbox.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.size;
  }, [filteredCards, selectedIds]);

  const resolveExportBaseName = (rawName?: string) => {
    const trimmed = (rawName || "").trim();
    const lower = trimmed.toLowerCase();
    const replacedSpaces = lower.replace(/\s+/g, "-");
    const safe = replacedSpaces.replace(/[^a-z0-9\-_.]+/g, "");
    return safe || "card";
  };

  const resolveExportFileName = (rawName: string, usedNames: Map<string, number>) => {
    const baseName = resolveExportBaseName(rawName);
    const withExtension = baseName.endsWith(".png") ? baseName : `${baseName}.png`;
    const currentCount = usedNames.get(withExtension) ?? 0;
    usedNames.set(withExtension, currentCount + 1);
    if (currentCount === 0) {
      return withExtension;
    }
    const dotIndex = withExtension.lastIndexOf(".");
    const stem = dotIndex >= 0 ? withExtension.slice(0, dotIndex) : withExtension;
    const ext = dotIndex >= 0 ? withExtension.slice(dotIndex) : "";
    return `${stem}-${currentCount + 1}${ext}`;
  };

  const waitForFrame = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

  const waitForAssetElements = async (assetIds: string[], timeoutMs = 4000) => {
    if (!assetIds.length) return;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const svg = previewRef.current?.getSvgElement();
      if (svg) {
        const hasAllAssets = assetIds.every((id) =>
          svg.querySelector(`image[data-user-asset-id="${id}"]`),
        );
        if (hasAllAssets) {
          return;
        }
      }
      await waitForFrame();
    }
  };

  const resolveZipFileName = () => {
    const now = new Date();
    const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("") +
      "-" +
      [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
    const collectionName =
      activeFilter.type === "collection"
        ? collections.find((collection) => collection.id === activeFilter.id)?.name
        : null;
    const base = collectionName ? resolveExportBaseName(collectionName) : "heroquest-cards";
    return `${base}-${timestamp}.zip`;
  };

  const handleBulkExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    setExportTotal(exportCards.length);
    setExportProgress(0);
    setExportCancelled(false);
    cancelExportRef.current = false;
    const usedNames = new Map<string, number>();
    const zip = new JSZip();
    let exportedCount = 0;

    try {
      if (!exportCards.length) {
        window.alert("Select at least one card to export.");
        return;
      }

      for (const card of exportCards) {
        if (cancelExportRef.current) {
          break;
        }
        setExportTarget(card);
        await waitForFrame();
        await waitForFrame();

        const assetIds = [card.imageAssetId, card.monsterIconAssetId].filter(
          (id): id is string => Boolean(id),
        );
        await waitForAssetElements(assetIds);

        const pngBlob = await previewRef.current?.renderToPngBlob();
        if (!pngBlob) {
          if (cancelExportRef.current) {
            break;
          }
          continue;
        }

        const fileName = resolveExportFileName(
          card.name || card.title || card.templateId,
          usedNames,
        );
        zip.file(fileName, pngBlob);
        exportedCount += 1;
        setExportProgress(exportedCount);
      }

      if (cancelExportRef.current) {
        return;
      }

      if (!exportedCount) {
        window.alert("No images were exported. Please try again.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = resolveZipFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[StockpileModal] Bulk export failed", error);
      window.alert("Could not export images. Please try again.");
    } finally {
      setIsExporting(false);
      setExportTarget(null);
      setExportTotal(0);
      setExportProgress(0);
      setExportCancelled(false);
      cancelExportRef.current = false;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Cards"
        contentClassName={styles.cardsPopover}
        footer={
          <div className={`d-flex w-100 align-items-center ${styles.stockpileFooter}`}>
            <div className="d-flex flex-shrink-1 flex-grow-0 gap-2">
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => {
                  setCollectionFormMode("create");
                  setCollectionName("");
                  setCollectionDescription("");
                  setIsCollectionModalOpen(true);
                }}
              >
                + New collection
              </button>
              {activeFilter.type === "collection" ? (
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => {
                    const target = collections.find((item) => item.id === activeFilter.id);
                    if (!target) return;
                    setCollectionFormMode("edit");
                    setCollectionName(target.name);
                    setCollectionDescription(target.description ?? "");
                    setIsCollectionModalOpen(true);
                  }}
                >
                  Edit collection
                </button>
              ) : null}
            </div>
            <div className="flex-grow-1 flex-shrink-0" />
            <div className="d-flex flex-shrink-1 flex-grow-0 gap-2">
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={handleBulkExport}
                disabled={!canExport}
              >
                {exportLabel}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!selectedCard || hasMultiSelection}
                onClick={() => {
                  if (!selectedCard || !onLoadCard) return;
                  onLoadCard(selectedCard);
                  onClose();
                }}
              >
                Load
              </button>
            </div>
          </div>
        }
      >
        <div className={styles.assetsToolbar}>
          <div className={styles.cardsFilters}>
            <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
              <span className="input-group-text">
                <Search className={styles.icon} aria-hidden="true" />
              </span>
              <input
                type="search"
                placeholder="Search cards..."
                className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch}`}
              title="Search saved cards by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span>Filter</span>
            <select
              className={`form-select form-select-sm ${styles.cardsFilterSelect}`}
              title="Filter cards by template type"
              value={templateFilter}
              onChange={(event) => setTemplateFilter(event.target.value)}
            >
              <option value="all">All types ({totalCount})</option>
              <option value="hero">Hero ({typeCounts.get("hero") ?? 0})</option>
              <option value="monster">Monster ({typeCounts.get("monster") ?? 0})</option>
              <option value="large-treasure">
                Large treasure ({typeCounts.get("large-treasure") ?? 0})
              </option>
              <option value="small-treasure">
                Small treasure ({typeCounts.get("small-treasure") ?? 0})
              </option>
              <option value="hero-back">Hero back ({typeCounts.get("hero-back") ?? 0})</option>
              <option value="labelled-back">
                Labelled back ({typeCounts.get("labelled-back") ?? 0})
              </option>
            </select>
            <label className="form-check form-check-inline mb-0 ms-2" title="Select all cards">
              <input
                ref={selectAllRef}
                className="form-check-input"
                type="checkbox"
                disabled={filteredCards.length === 0}
                onChange={(event) => {
                  const visibleIds = filteredCards.map((card) => card.id);
                  if (!visibleIds.length) return;
                  setSelectedIds((prev) => {
                    const prevSet = new Set(prev);
                    const allSelected = visibleIds.every((id) => prevSet.has(id));
                    if (allSelected) {
                      return prev.filter((id) => !visibleIds.includes(id));
                    }
                    const merged = new Set(prev);
                    visibleIds.forEach((id) => merged.add(id));
                    return Array.from(merged);
                  });
                  event.currentTarget.checked = false;
                }}
              />
              <span className={`form-check-label ${styles.selectAllLabel}`}>Select all</span>
            </label>
          </div>
        </div>
          <div className={styles.assetsToolbarSpacer} />
          <div className={`${styles.assetsActions} gap-2`}>
            {collections.filter(
              (collection) =>
                activeFilter.type !== "collection" || collection.id !== activeFilter.id,
            ).length ? (
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                disabled={!visibleSelectedIds.length}
                onClick={() => {
                  const available = collections.filter(
                    (collection) =>
                      activeFilter.type !== "collection" ||
                      collection.id !== activeFilter.id,
                  );
                  if (!available.length) return;
                  setAddTargetCollectionId((prev) => prev || available[0]?.id || "");
                  setIsAddModalOpen(true);
                }}
              >
                Add to collection…
              </button>
            ) : null}
            {activeFilter.type === "collection" ? (
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                disabled={!selectedIds.length}
                onClick={async () => {
                  const target = collections.find((item) => item.id === activeFilter.id);
                  if (!target) return;
                  try {
                    const remaining = target.cardIds.filter((id) => !selectedIds.includes(id));
                    await updateCollection(target.id, { cardIds: remaining });
                    const refreshed = await listCollections();
                    setCollections(refreshed);
                    setSelectedIds([]);
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error("[StockpileModal] Failed to remove from collection", error);
                  }
                }}
              >
                Remove from collection
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={!selectedIds.length}
              onClick={async () => {
                if (!selectedIds.length) return;
                const confirmDelete = window.confirm(
                  `Delete ${selectedIds.length} card(s) from your library? This cannot be undone.`,
                );
                if (!confirmDelete) return;

                try {
                  await deleteCards(selectedIds);
                  const idSet = new Set(selectedIds);
                  const updates = collections
                    .map((collection) => {
                      const nextCardIds = collection.cardIds.filter((id) => !idSet.has(id));
                      return nextCardIds.length === collection.cardIds.length
                        ? null
                        : { id: collection.id, cardIds: nextCardIds };
                    })
                    .filter(Boolean) as Array<{ id: string; cardIds: string[] }>;
                  await Promise.all(
                    updates.map((update) =>
                      updateCollection(update.id, { cardIds: update.cardIds }),
                    ),
                  );
                  const refreshed = await listCards({ status: "saved" });
                  setCards(refreshed);
                  const refreshedCollections = await listCollections();
                  setCollections(refreshedCollections);
                  setSelectedIds([]);
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error("[StockpileModal] Failed to delete card", error);
                }
              }}
            >
              {selectedIds.length > 1 ? `Delete (${selectedIds.length})` : "Delete"}
            </button>
          </div>
        </div>
        <div className={styles.stockpileLayout}>
          <aside className={styles.stockpileSidebar} aria-label="Collections">
            <div className={styles.stockpileSidebarHeader}>Collections</div>
            <div className={styles.stockpileSidebarList}>
            <button
              type="button"
              className={`${styles.stockpileSidebarItem} ${activeFilter.type === "all" ? styles.stockpileSidebarItemActive : ""}`}
              onClick={() => {
                setActiveFilter({ type: "all" });
                setSelectedIds([]);
              }}
            >
              All cards
            </button>
              <button
                type="button"
                className={`${styles.stockpileSidebarItem} ${activeFilter.type === "unfiled" ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                onClick={() => {
                  setActiveFilter({ type: "unfiled" });
                  setSelectedIds([]);
                }}
              >
                <span className="flex-grow-1 text-truncate fs-6">Unfiled</span>
                <span className="badge rounded-pill bg-warning text-dark fs-6 px-2 py-1">
                  {unfiledCount}
                </span>
              </button>
              <div className={styles.stockpileSidebarDivider} />
            </div>
            <div className={styles.stockpileSidebarMiddle}>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className={`${styles.stockpileSidebarItem} ${activeFilter.type === "collection" && activeFilter.id === collection.id ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                  onClick={() => {
                    setActiveFilter({ type: "collection", id: collection.id });
                    setSelectedIds([]);
                  }}
                  title={collection.description || collection.name}
                >
                  <span className="flex-grow-1 text-truncate fs-6">{collection.name}</span>
                  <span className="badge rounded-pill bg-warning text-dark fs-6 px-2 py-1">
                    {collectionCounts.get(collection.id) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <div className={styles.stockpileContentPane}>
            <div className={styles.assetsGridContainer}>
              {filteredCards.length === 0 ? (
                <div className={styles.assetsEmptyState}>
                  {search.trim()
                    ? "No cards found."
                    : activeFilter.type === "collection"
                      ? templateFilter !== "all" && totalCount > 0
                        ? `Collection filtered by type ${templateFilterLabelMap[templateFilter] ?? templateFilter}.`
                        : "This collection is empty."
                      : activeFilter.type === "unfiled"
                        ? "Nothing unfiled."
                        : "No saved cards yet."}
                </div>
              ) : (
                <div className={styles.assetsGrid}>
                  {filteredCards.map((card) => {
                    const updated = new Date(card.updatedAt);
                    const updatedLabel = updated.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    });
                    const timeLabel = updated.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const thumbUrl =
                      typeof window !== "undefined" && card.thumbnailBlob
                        ? URL.createObjectURL(card.thumbnailBlob)
                        : null;
                    const isSelected = selectedIds.includes(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`${styles.assetsItem} ${isSelected ? styles.assetsItemSelected : ""}`}
                        onClick={(event) => {
                          const allowMulti = event.metaKey || event.ctrlKey;
                          if (allowMulti) {
                            setSelectedIds((prev) =>
                              prev.includes(card.id)
                                ? prev.filter((id) => id !== card.id)
                                : [...prev, card.id],
                            );
                            return;
                          }
                          setSelectedIds([card.id]);
                        }}
                        onDoubleClick={() => {
                          if (!onLoadCard) return;
                          onLoadCard(card);
                          onClose();
                        }}
                      >
                        <div className={styles.cardsItemHeader}>
                          <div className={styles.cardsItemName} title={card.name}>
                            {card.name}
                          </div>
                        </div>
                        <div className={styles.cardsThumbWrapper}>
                          {thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbUrl}
                              alt={card.name}
                              className={styles.cardsThumbImage}
                              onLoad={() => {
                                URL.revokeObjectURL(thumbUrl);
                              }}
                            />
                          ) : null}
                        </div>
                        <div className={styles.cardsItemMeta}>
                          <div
                            className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
                          >
                            {card.templateId}
                          </div>
                          <div className={styles.cardsItemDetails}>
                            {updatedLabel} {timeLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalShell>
      {isOpen && exportTarget && exportTemplate ? (
        <div className={styles.bulkExportPreview} aria-hidden="true">
          <CardPreview
            ref={previewRef}
            templateId={exportTemplate.id}
            templateName={exportTemplate.name}
            backgroundSrc={exportTemplate.background}
            cardData={exportCardData}
          />
        </div>
      ) : null}
      {isExporting ? (
        <div className={styles.stockpileOverlayBackdrop}>
          <div className={styles.stockpileOverlayPanel}>
            <div className={styles.stockpileOverlayHeader}>
              <h3 className={styles.stockpileOverlayTitle}>{exportTitle}</h3>
            </div>
            <div className="d-flex flex-column gap-2">
              <div className={styles.exportProgressTrack} aria-hidden="true">
                <div
                  className={styles.exportProgressFill}
                  style={{ width: `${exportPercent}%` }}
                />
              </div>
              <div className={styles.exportProgressLabel}>
                {exportProgress} / {exportTotal}
              </div>
            </div>
            <div className={styles.stockpileOverlayActions}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={exportCancelled}
                onClick={() => {
                  cancelExportRef.current = true;
                  setExportCancelled(true);
                }}
              >
                {exportCancelled ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isCollectionModalOpen ? (
        <div
          className={styles.stockpileOverlayBackdrop}
          onClick={() => setIsCollectionModalOpen(false)}
        >
          <div
            className={styles.stockpileOverlayPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.stockpileOverlayHeader}>
              <h3 className={styles.stockpileOverlayTitle}>
                {collectionFormMode === "edit" ? "Edit collection" : "New collection"}
              </h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsCollectionModalOpen(false)}
              >
                <span className="visually-hidden">Close</span>
                ✕
              </button>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const trimmedName = collectionName.trim();
                if (!trimmedName) {
                  setCollectionNameError("Name is required.");
                  return;
                }
                const normalized = trimmedName.toLocaleLowerCase();
                const conflict = collections.some((collection) => {
                  if (collectionFormMode === "edit" && activeFilter.type === "collection") {
                    if (collection.id === activeFilter.id) return false;
                  }
                  return collection.name.toLocaleLowerCase() === normalized;
                });
                if (conflict) {
                  setCollectionNameError("Name already exists.");
                  return;
                }
                setCollectionNameError(null);
                try {
                  if (collectionFormMode === "edit") {
                    if (activeFilter.type !== "collection") return;
                    await updateCollection(activeFilter.id, {
                      name: trimmedName,
                      description: collectionDescription.trim() || undefined,
                    });
                  } else {
                    const created = await createCollection({
                      name: trimmedName,
                      description: collectionDescription.trim() || undefined,
                    });
                    setActiveFilter({ type: "collection", id: created.id });
                    setAddTargetCollectionId(created.id);
                  }
                  const refreshed = await listCollections();
                  setCollections(refreshed);
                  setIsCollectionModalOpen(false);
                  setCollectionName("");
                  setCollectionDescription("");
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error("[StockpileModal] Failed to create collection", error);
                }
              }}
            >
              <div className="d-flex flex-column gap-2">
                <label className="d-flex flex-column gap-1">
                  <span>Collection name</span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Name"
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
                  <span>Description</span>
                  <textarea
                    className="form-control form-control-sm"
                    placeholder="Description (optional)"
                    value={collectionDescription}
                    onChange={(event) => setCollectionDescription(event.target.value)}
                    rows={3}
                  />
                </label>
              </div>
              <div className={styles.stockpileOverlayActions}>
                {collectionFormMode === "edit" ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={async () => {
                      if (activeFilter.type !== "collection") return;
                      const confirmDelete = window.confirm(
                        `Delete collection "${collectionName}"? Cards in this collection will not be deleted.`,
                      );
                      if (!confirmDelete) return;
                      try {
                        await deleteCollection(activeFilter.id);
                        const refreshed = await listCollections();
                        setCollections(refreshed);
                        setActiveFilter({ type: "all" });
                        if (typeof window !== "undefined") {
                          window.localStorage.removeItem("hqcc.selectedCollectionId");
                        }
                        setStoredCollectionId(null);
                        setIsCollectionModalOpen(false);
                        setCollectionName("");
                        setCollectionDescription("");
                      } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error("[StockpileModal] Failed to delete collection", error);
                      }
                    }}
                  >
                    Delete
                  </button>
                ) : null}
                <button type="submit" className="btn btn-primary btn-sm">
                  {collectionFormMode === "edit" ? "Save" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsCollectionModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isAddModalOpen ? (
        <div
          className={styles.stockpileOverlayBackdrop}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className={styles.stockpileOverlayPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.stockpileOverlayHeader}>
              <h3 className={styles.stockpileOverlayTitle}>Add to collection</h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                <span className="visually-hidden">Close</span>
                ✕
              </button>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!addTargetCollectionId) return;
                const target = collections.find((item) => item.id === addTargetCollectionId);
                if (!target) return;
                try {
                  const merged = new Set<string>(target.cardIds);
                  visibleSelectedIds.forEach((id) => merged.add(id));
                  await updateCollection(target.id, { cardIds: Array.from(merged) });
                  const refreshed = await listCollections();
                  setCollections(refreshed);
                  setIsAddModalOpen(false);
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error("[StockpileModal] Failed to add to collection", error);
                }
              }}
            >
              <label>
                <span className="visually-hidden">Target collection</span>
                <select
                  className="form-select form-select-sm"
                  value={addTargetCollectionId}
                  onChange={(event) => setAddTargetCollectionId(event.target.value)}
                  required
                >
                  {collections
                    .filter(
                      (collection) =>
                        activeFilter.type !== "collection" ||
                        collection.id !== activeFilter.id,
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
                  Add
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
