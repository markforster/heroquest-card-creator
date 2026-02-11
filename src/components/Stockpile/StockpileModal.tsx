"use client";

import JSZip from "jszip";
import { AlertTriangle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import CardPreview from "@/components/CardPreview";
import ConfirmModal from "@/components/ConfirmModal";
import ModalShell from "@/components/ModalShell";
import { useStockpileData } from "@/components/Stockpile/hooks/useStockpileData";
import {
  formatMessage,
  resolveExportFileName,
  resolveZipFileName,
  waitForAssetElements,
  waitForFrame,
} from "@/components/Stockpile/stockpile-utils";
import { USE_ZIP_COMPRESSION } from "@/config/flags";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { deleteCards, listCards } from "@/lib/cards-db";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "@/lib/collections-db";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";
import type { CardRecord } from "@/types/cards-db";

import { CardPreviewHandle } from "../CardPreview/types";

type StockpileModalMode = "manage" | "pair-fronts" | "pair-backs";

type StockpileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
  mode?: StockpileModalMode;
  onConfirmSelection?: (cardIds: string[]) => void;
  initialSelectedIds?: string[];
  titleOverride?: string;
};

export default function StockpileModal({
  isOpen,
  onClose,
  onLoadCard,
  refreshToken,
  activeCardId,
  mode = "manage",
  onConfirmSelection,
  initialSelectedIds,
  titleOverride,
}: StockpileModalProps) {
  const { t, language } = useI18n();
  const formatMessageWith = (key: string, vars: Record<string, string | number>) =>
    formatMessage(t(key as never), vars);
  const isPairFronts = mode === "pair-fronts";
  const isPairBacks = mode === "pair-backs";
  const isPairMode = isPairFronts || isPairBacks;
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [pairingConflictDialog, setPairingConflictDialog] = useState<{
    count: number;
    cardIds: string[];
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    { type: "all" } | { type: "recent" } | { type: "unfiled" } | { type: "collection"; id: string }
  >({ type: "all" });
  const { cards, setCards, collections, setCollections } = useStockpileData({
    isOpen,
    refreshToken,
    activeFilter,
    setActiveFilter,
  });
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionFormMode, setCollectionFormMode] = useState<"create" | "edit">("create");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTargetCollectionId, setAddTargetCollectionId] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionNameError, setCollectionNameError] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCancelled, setExportCancelled] = useState(false);
  const previewRef = useRef<CardPreviewHandle | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const cancelExportRef = useRef(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [hoveredPairCardId, setHoveredPairCardId] = useState<string | null>(null);
  const pairHoverTimeoutRef = useRef<number | null>(null);
  const [pairPopoverAnchor, setPairPopoverAnchor] = useState<{
    id: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);
  const [conflictPopoverCardId, setConflictPopoverCardId] = useState<string | null>(null);
  const conflictHoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (pairHoverTimeoutRef.current) {
        window.clearTimeout(pairHoverTimeoutRef.current);
      }
      if (conflictHoverTimeoutRef.current) {
        window.clearTimeout(conflictHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isPairMode) return;
    setTemplateFilter("all");
    setSelectedIds([]);
  }, [isOpen, isPairMode]);

  useEffect(() => {
    if (!isOpen) return;

    setIsCollectionModalOpen(false);
    setCollectionName("");
    setCollectionDescription("");
  }, [isOpen]);

  const recentCards = useMemo(() => {
    const withViewed = cards.filter((card) => typeof card.lastViewedAt === "number");
    const filtered = isPairMode
      ? withViewed.filter((card) => {
          const template = cardTemplatesById[card.templateId];
          if (!template) return false;
          const effectiveFace = card.face ?? template.defaultFace;
          return isPairBacks ? effectiveFace === "back" : effectiveFace === "front";
        })
      : withViewed;
    return filtered.sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) {
        return bViewed - aViewed;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [cards, isPairMode, isPairBacks]);

  const {
    filteredCards,
    collectionCounts,
    unfiledCount,
    typeCounts,
    totalCount,
    faceCounts,
    visibleCollectionIds,
    eligibleIdSet,
    overallCount,
  } = useMemo(() => {
    const isFrontCard = (card: CardRecord) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return false;
      const effectiveFace = card.face ?? template.defaultFace;
      return effectiveFace === "front";
    };
    const isBackCard = (card: CardRecord) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return false;
      const effectiveFace = card.face ?? template.defaultFace;
      return effectiveFace === "back";
    };

    let base = isPairMode
      ? isPairBacks
        ? cards.filter(isBackCard)
        : cards.filter(isFrontCard)
      : cards;

    if (activeFilter.type === "recent") {
      base = isPairMode
        ? isPairBacks
          ? recentCards.filter(isBackCard)
          : recentCards.filter(isFrontCard)
        : recentCards;
    }

    if (search.trim()) {
      const q = search.toLocaleLowerCase();
      base = base.filter((card) => card.nameLower.includes(q));
    }

    const countsBase = base;
    const cardIdSet = new Set(countsBase.map((card) => card.id));
    const counts = new Map<string, number>();
    const membershipIndex = new Map<string, number>();
    const eligibleBase = isPairMode
      ? isPairBacks
        ? cards.filter(isBackCard)
        : cards.filter(isFrontCard)
      : cards;
    const eligibleIdSet = new Set(eligibleBase.map((card) => card.id));
    const visibleCollectionIds = new Set<string>();

    collections.forEach((collection) => {
      let count = 0;
      collection.cardIds.forEach((cardId) => {
        if (cardIdSet.has(cardId)) {
          count += 1;
          membershipIndex.set(cardId, (membershipIndex.get(cardId) ?? 0) + 1);
        }
      });
      counts.set(collection.id, count);
      if (collection.cardIds.some((cardId) => eligibleIdSet.has(cardId))) {
        visibleCollectionIds.add(collection.id);
      }
    });

    const unfiled = countsBase.reduce((total, card) => {
      return membershipIndex.has(card.id) ? total : total + 1;
    }, 0);

    let filteredBase = base;
    if (activeFilter.type === "collection") {
      const collection = collections.find((item) => item.id === activeFilter.id);
      if (!collection) {
        return {
          filteredCards: filteredBase,
          collectionCounts: counts,
          unfiledCount: unfiled,
          typeCounts: new Map<string, number>(),
          totalCount: filteredBase.length,
          faceCounts: { front: 0, back: 0 },
          visibleCollectionIds,
          eligibleIdSet,
          overallCount: countsBase.length,
        };
      }
      const allowed = new Set(collection.cardIds);
      filteredBase = filteredBase.filter((card) => allowed.has(card.id));
    }

    if (activeFilter.type === "unfiled") {
      filteredBase = filteredBase.filter((card) => !membershipIndex.has(card.id));
    }

    const templateCounts = new Map<string, number>();
    filteredBase.forEach((card) => {
      templateCounts.set(card.templateId, (templateCounts.get(card.templateId) ?? 0) + 1);
    });
    const nextFaceCounts = {
      front: 0,
      back: 0,
    };
    filteredBase.forEach((card) => {
      const template = cardTemplatesById[card.templateId];
      if (!template) return;
      const effectiveFace = card.face ?? template.defaultFace;
      if (effectiveFace === "front") {
        nextFaceCounts.front += 1;
      } else if (effectiveFace === "back") {
        nextFaceCounts.back += 1;
      }
    });

    let filtered = filteredBase;
    if (templateFilter === "front") {
      filtered = filtered.filter((card) => {
        const template = cardTemplatesById[card.templateId];
        if (!template) return false;
        const effectiveFace = card.face ?? template.defaultFace;
        return effectiveFace === "front";
      });
    } else if (templateFilter === "back") {
      filtered = filtered.filter((card) => {
        const template = cardTemplatesById[card.templateId];
        if (!template) return false;
        const effectiveFace = card.face ?? template.defaultFace;
        return effectiveFace === "back";
      });
    } else if (templateFilter !== "all") {
      filtered = filtered.filter((card) => card.templateId === templateFilter);
    }

    if (isPairMode) {
      filtered = [...filtered].sort((a, b) => {
        const aViewed = a.lastViewedAt ?? 0;
        const bViewed = b.lastViewedAt ?? 0;
        if (bViewed !== aViewed) return bViewed - aViewed;
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
        const aName = a.nameLower ?? a.name.toLocaleLowerCase();
        const bName = b.nameLower ?? b.name.toLocaleLowerCase();
        return aName.localeCompare(bName);
      });
    }

    return {
      filteredCards: filtered,
      collectionCounts: counts,
      unfiledCount: unfiled,
      typeCounts: templateCounts,
      totalCount: filteredBase.length,
      faceCounts: nextFaceCounts,
      visibleCollectionIds,
      eligibleIdSet,
      overallCount: countsBase.length,
    };
  }, [
    cards,
    recentCards,
    search,
    templateFilter,
    activeFilter,
    collections,
    isPairMode,
    isPairBacks,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      return;
    }
    const normalizedInitial =
      initialSelectedIds?.filter((id) => typeof id === "string" && id.length > 0) ?? [];
    if (isPairMode) {
      setSelectedIds((prev) => {
        const merged = Array.from(new Set([...normalizedInitial, ...prev]));
        if (isPairBacks) {
          return merged.length ? [merged[0]] : [];
        }
        return merged;
      });
      return;
    }
    setSelectedIds((prev) => {
      const base = prev.length ? prev : activeCardId ? [activeCardId] : [];
      if (!normalizedInitial.length) {
        return base;
      }
      const merged = new Set<string>([...base, ...normalizedInitial]);
      return Array.from(merged);
    });
  }, [isOpen, activeCardId, isPairMode, isPairBacks, initialSelectedIds]);

  const selectedCard =
    selectedIds.length === 1 ? cards.find((card) => card.id === selectedIds[0]) : undefined;
  const visibleSelectedIds = useMemo(() => {
    if (!filteredCards.length || !selectedIds.length) return [];
    const visibleIds = new Set(filteredCards.map((card) => card.id));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [filteredCards, selectedIds]);
  const hasMultiSelection = selectedIds.length > 1;
  const templateFilterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    cardTemplates.forEach((template) => {
      map[template.id] = getTemplateNameLabel(language, template);
    });
    return map;
  }, [language]);
  const filterLabel =
    templateFilter === "all"
      ? t("ui.allTypes")
      : templateFilter === "front"
        ? t("cardFace.frontFacing")
        : templateFilter === "back"
          ? t("cardFace.backFacing")
          : (templateFilterLabelMap[templateFilter] ?? templateFilter);
  const exportTemplate =
    exportTarget && cardTemplatesById[exportTarget.templateId]
      ? cardTemplatesById[exportTarget.templateId]
      : null;
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget) : undefined;
  const cardById = useMemo(() => {
    const map = new Map<string, CardRecord>();
    cards.forEach((card) => {
      map.set(card.id, card);
    });
    return map;
  }, [cards]);
  const activeBackId = useMemo(() => {
    if (!isPairFronts || !activeCardId) return null;
    return activeCardId;
  }, [isPairFronts, activeCardId]);
  const pairedByTargetId = useMemo(() => {
    const map = new Map<string, CardRecord[]>();
    cards.forEach((card) => {
      if (!card.pairedWith) return;
      const existing = map.get(card.pairedWith) ?? [];
      existing.push(card);
      map.set(card.pairedWith, existing);
    });
    return map;
  }, [cards]);
  const selectedCards = cards.filter((card) => selectedIds.includes(card.id));
  const activeCollection =
    activeFilter.type === "collection"
      ? collections.find((collection) => collection.id === activeFilter.id)
      : null;
  const visibleCollections = useMemo(() => {
    if (!isPairMode) return collections;
    return collections.filter((collection) => visibleCollectionIds.has(collection.id));
  }, [collections, isPairMode, visibleCollectionIds]);
  const selectedCountByCollection = useMemo(() => {
    if (!collections.length || !selectedIds.length) return new Map<string, number>();
    const selectedSet = new Set(selectedIds);
    const map = new Map<string, number>();
    collections.forEach((collection) => {
      let count = 0;
      collection.cardIds.forEach((cardId) => {
        if (selectedSet.has(cardId)) {
          count += 1;
        }
      });
      if (count > 0) {
        map.set(collection.id, count);
      }
    });
    return map;
  }, [collections, selectedIds]);
  const activeCollectionCards = activeCollection
    ? cards.filter(
        (card) => activeCollection.cardIds.includes(card.id) && eligibleIdSet.has(card.id),
      )
    : [];
  const exportCards =
    activeFilter.type === "collection" && selectedCards.length === 0
      ? activeCollectionCards
      : selectedCards;
  const canExport =
    !isExporting &&
    exportCards.length > 0 &&
    (activeFilter.type === "collection" ||
      ((activeFilter.type === "all" || activeFilter.type === "unfiled") && selectedIds.length > 0));
  const exportCount = exportCards.length;
  const exportLabel = isExporting
    ? t("actions.exporting")
    : activeFilter.type === "collection" && selectedCards.length === 0
      ? `${t("actions.exportAll")} ${t("actions.fromThisCollection")}`
      : activeFilter.type === "collection"
        ? `${t("actions.export")} (${exportCount}) ${t("actions.fromThisCollection")}`
        : `${t("actions.export")} (${exportCount})`;
  const exportCollectionName = activeCollection?.name;
  const exportPercent = exportTotal > 0 ? Math.round((exportProgress / exportTotal) * 100) : 0;
  const exportTitle = exportCollectionName
    ? `${t("status.exportingImagesFrom")} ${exportCollectionName} (${exportTotal})`
    : `${t("status.exportingImages")} (${exportTotal})`;

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
        window.alert(t("alert.selectCardToExport"));
        return;
      }

      for (const card of exportCards) {
        if (cancelExportRef.current) {
          break;
        }
        setExportTarget(card);
        await waitForFrame();
        await waitForFrame();

        const assetIds = [card.imageAssetId, card.monsterIconAssetId].filter((id): id is string =>
          Boolean(id),
        );
        await waitForAssetElements(() => previewRef.current?.getSvgElement(), assetIds);

        const pngBlob = await previewRef.current?.renderToPngBlob();
        if (!pngBlob) {
          if (cancelExportRef.current) {
            break;
          }
          continue;
        }

        const fileName = resolveExportFileName(
          card.name || card.title || templateFilterLabelMap[card.templateId] || card.templateId,
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
        window.alert(t("alert.noImagesExported"));
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        ...(USE_ZIP_COMPRESSION
          ? { compression: "DEFLATE", compressionOptions: { level: 6 } }
          : {}),
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = resolveZipFileName(() => {
        if (activeFilter.type !== "collection") return null;
        return collections.find((collection) => collection.id === activeFilter.id)?.name ?? null;
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      void openDownloadsFolderIfTauri();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[StockpileModal] Bulk export failed", error);
      window.alert(t("alert.exportImagesFailed"));
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
        title={titleOverride ?? t("heading.cards")}
        contentClassName={styles.cardsPopover}
        footer={
          isPairMode ? (
            <div className="d-flex w-100 justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isPairBacks ? selectedIds.length !== 1 : selectedIds.length === 0}
                onClick={() => {
                  if (!onConfirmSelection) {
                    onClose();
                    return;
                  }
                  if (isPairFronts) {
                    const conflicting = selectedIds.filter((id) => {
                      const selectedCard = cardById.get(id);
                      if (!selectedCard?.pairedWith) return false;
                      return selectedCard.pairedWith !== activeBackId;
                    });
                    if (conflicting.length > 0) {
                      setPairingConflictDialog({
                        count: conflicting.length,
                        cardIds: conflicting,
                        onConfirm: async () => {
                          onConfirmSelection(selectedIds);
                          onClose();
                        },
                      });
                      return;
                    }
                  }
                  onConfirmSelection(selectedIds);
                  onClose();
                }}
              >
                {t("actions.confirm")}
              </button>
            </div>
          ) : (
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
                  + {t("actions.newCollection")}
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
                    {t("actions.editCollection")}
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
                  {t("actions.load")}
                </button>
              </div>
            </div>
          )
        }
      >
        <div className={styles.assetsToolbar}>
          <div className={styles.cardsFiltersRow}>
            <div className={styles.cardsFiltersLeft}>
              <div className="input-group input-group-sm" style={{ width: 325 }}>
                <span className="input-group-text">
                  <Search className={styles.icon} aria-hidden="true" />
                </span>
                <input
                  type="search"
                  placeholder={t("placeholders.searchCards")}
                  className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch}`}
                  title={t("tooltip.searchCards")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className={styles.cardsFilterMenu} ref={filterMenuRef}>
                  <button
                    type="button"
                    className={styles.cardsFilterButton}
                    title={t("tooltip.filterCards")}
                    aria-expanded={isFilterMenuOpen}
                    onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                  >
                    <span>{filterLabel}</span>
                  </button>
                  {isFilterMenuOpen ? (
                    <div className={styles.cardsFilterPopover} role="menu">
                      <button
                        type="button"
                        className={`${styles.cardsFilterItem} ${
                          templateFilter === "all" ? styles.cardsFilterItemActive : ""
                        }`}
                        role="menuitem"
                        onClick={() => {
                          setTemplateFilter("all");
                          setIsFilterMenuOpen(false);
                        }}
                      >
                        <span>{t("ui.allTypes")}</span>
                        <span className={styles.cardsFilterCount}>{totalCount}</span>
                      </button>
                      {!isPairBacks ? (
                        <>
                          <button
                            type="button"
                            className={`${styles.cardsFilterItem} ${
                              templateFilter === "front" ? styles.cardsFilterItemActive : ""
                            }`}
                            role="menuitem"
                            onClick={() => {
                              setTemplateFilter("front");
                              setIsFilterMenuOpen(false);
                            }}
                          >
                            <span>{t("cardFace.frontFacing")}</span>
                            <span className={styles.cardsFilterCount}>{faceCounts.front}</span>
                          </button>
                          {cardTemplates
                            .filter((template) => template.defaultFace === "front")
                            .map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                className={`${styles.cardsFilterItem} ${
                                  templateFilter === template.id ? styles.cardsFilterItemActive : ""
                                }`}
                                role="menuitem"
                                onClick={() => {
                                  setTemplateFilter(template.id);
                                  setIsFilterMenuOpen(false);
                                }}
                              >
                                <span>{getTemplateNameLabel(language, template)}</span>
                                <span className={styles.cardsFilterCount}>
                                  {typeCounts.get(template.id) ?? 0}
                                </span>
                              </button>
                            ))}
                        </>
                      ) : null}
                      {!isPairFronts ? (
                        <>
                          <button
                            type="button"
                            className={`${styles.cardsFilterItem} ${
                              templateFilter === "back" ? styles.cardsFilterItemActive : ""
                            }`}
                            role="menuitem"
                            onClick={() => {
                              setTemplateFilter("back");
                              setIsFilterMenuOpen(false);
                            }}
                          >
                            <span>{t("cardFace.backFacing")}</span>
                            <span className={styles.cardsFilterCount}>{faceCounts.back}</span>
                          </button>
                          {cardTemplates
                            .filter((template) => template.defaultFace === "back")
                            .map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                className={`${styles.cardsFilterItem} ${
                                  templateFilter === template.id ? styles.cardsFilterItemActive : ""
                                }`}
                                role="menuitem"
                                onClick={() => {
                                  setTemplateFilter(template.id);
                                  setIsFilterMenuOpen(false);
                                }}
                              >
                                <span>{getTemplateNameLabel(language, template)}</span>
                                <span className={styles.cardsFilterCount}>
                                  {typeCounts.get(template.id) ?? 0}
                                </span>
                              </button>
                            ))}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className={styles.cardsFiltersSpacer} />
            <div className={styles.cardsFiltersRight}>
              {isPairBacks ? null : (
                <label
                  className="form-check form-check-inline mb-0 ms-2"
                  title={t("tooltip.selectAllCards")}
                >
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
                  <span className={`form-check-label ${styles.selectAllLabel}`}>
                    {t("form.selectAll")}
                  </span>
                </label>
              )}
              {isPairMode ? (
                <div className={`${styles.assetsActions} ms-3 gap-2`}>
                  <span className={styles.cardsSelectionLabel}>{t("status.selectedCards")}</span>
                  <span className="badge rounded-pill bg-warning text-dark fs-6 px-2 py-1">
                    {selectedIds.length}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {!isPairMode ? (
          <div className={styles.assetsToolbar}>
            <div className={`${styles.assetsActions} ms-auto gap-2`}>
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
                        activeFilter.type !== "collection" || collection.id !== activeFilter.id,
                    );
                    if (!available.length) return;
                    setAddTargetCollectionId((prev) => prev || available[0]?.id || "");
                    setIsAddModalOpen(true);
                  }}
                >
                  {t("actions.addToCollection")}
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
                  {t("actions.removeFromCollection")}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={!selectedIds.length}
                onClick={async () => {
                  if (!selectedIds.length) return;
                  const ids = [...selectedIds];
                  setConfirmDialog({
                    title: t("confirm.deleteCardsTitle"),
                    body: `${t("confirm.deleteCardsBodyPrefix")} ${ids.length} ${
                      ids.length === 1 ? t("label.card") : t("label.cards")
                    } ${t("confirm.deleteCardsBodySuffix")}`,
                    confirmLabel:
                      ids.length > 1
                        ? `${t("actions.delete")} (${ids.length})`
                        : t("actions.delete"),
                    onConfirm: async () => {
                      try {
                        await deleteCards(ids);
                        const idSet = new Set(ids);
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
                      } finally {
                        setConfirmDialog(null);
                      }
                    },
                  });
                }}
              >
                {selectedIds.length > 1
                  ? `${t("actions.delete")} (${selectedIds.length})`
                  : t("actions.delete")}
              </button>
            </div>
          </div>
        ) : null}
        <div className={styles.stockpileLayout}>
          <aside className={styles.stockpileSidebar} aria-label={t("heading.collections")}>
            <div className={styles.stockpileSidebarHeader}>{t("heading.collections")}</div>
            <div className={styles.stockpileSidebarList}>
              <button
                type="button"
                className={`${styles.stockpileSidebarItem} ${activeFilter.type === "recent" ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                onClick={() => {
                  setActiveFilter({ type: "recent" });
                  if (!isPairMode) {
                    setSelectedIds([]);
                  }
                }}
              >
                <span className="flex-grow-1 text-truncate fs-6">{t("actions.recentCards")}</span>
                {!isPairMode ? (
                  <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
                    {recentCards.length}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={`${styles.stockpileSidebarItem} ${activeFilter.type === "all" ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                onClick={() => {
                  setActiveFilter({ type: "all" });
                  if (!isPairMode) {
                    setSelectedIds([]);
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
                className={`${styles.stockpileSidebarItem} ${activeFilter.type === "unfiled" ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                onClick={() => {
                  setActiveFilter({ type: "unfiled" });
                  if (!isPairMode) {
                    setSelectedIds([]);
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
              {visibleCollections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className={`${styles.stockpileSidebarItem} ${activeFilter.type === "collection" && activeFilter.id === collection.id ? styles.stockpileSidebarItemActive : ""} d-flex align-items-center gap-2`}
                  onClick={() => {
                    setActiveFilter({ type: "collection", id: collection.id });
                    if (!isPairMode) {
                      setSelectedIds([]);
                    }
                  }}
                  title={collection.description || collection.name}
                >
                  <span className="flex-grow-1 text-truncate fs-6">{collection.name}</span>
                  {!isPairMode ? (
                    <span className={`badge rounded-pill px-2 py-1 ${styles.stockpileCountBadge}`}>
                      {collectionCounts.get(collection.id) ?? 0}
                    </span>
                  ) : null}
                  {isPairMode && selectedCountByCollection.get(collection.id) ? (
                    <span className={styles.stockpileSelectedDot} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          </aside>
          <div className={styles.stockpileContentPane}>
            <div className={styles.assetsGridContainer}>
              {filteredCards.length === 0 ? (
                <div className={styles.assetsEmptyState}>
                  {search.trim()
                    ? t("empty.noCardsFound")
                    : activeFilter.type === "recent"
                      ? t("empty.noRecentCards")
                      : activeFilter.type === "collection"
                        ? templateFilter !== "all" && totalCount > 0
                          ? `${t("empty.collectionFilteredByType")} ${filterLabel}.`
                          : t("empty.collectionEmpty")
                        : activeFilter.type === "unfiled"
                          ? t("empty.nothingUnfiled")
                          : t("empty.noSavedCards")}
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
                    const isPairingConflict =
                      isPairFronts && card.pairedWith && card.pairedWith !== activeBackId;
                    const templateMeta = cardTemplatesById[card.templateId];
                    const effectiveFace = card.face ?? templateMeta?.defaultFace;
                    const pairedFronts = pairedByTargetId.get(card.id) ?? [];
                    const pairedCard = card.pairedWith
                      ? (cardById.get(card.pairedWith) ?? null)
                      : (pairedFronts[0] ?? null);
                    const pairedThumbUrl =
                      typeof window !== "undefined" && pairedCard?.thumbnailBlob
                        ? URL.createObjectURL(pairedCard.thumbnailBlob)
                        : null;
                    const pairedTemplateThumb = pairedCard
                      ? cardTemplatesById[pairedCard.templateId]?.thumbnail
                      : null;
                    const visiblePairedFronts = pairedFronts.slice(0, 3);
                    const pairedFrontsOverflow =
                      pairedFronts.length > 3 ? pairedFronts.length - 3 : 0;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`${styles.assetsItem} ${
                          isSelected
                            ? isPairingConflict
                              ? styles.assetsItemConflict
                              : styles.assetsItemSelected
                            : ""
                        }`}
                        onMouseEnter={() => {
                          if (!isPairingConflict || !isSelected) return;
                          if (conflictHoverTimeoutRef.current) {
                            window.clearTimeout(conflictHoverTimeoutRef.current);
                          }
                          setConflictPopoverCardId(card.id);
                        }}
                        onMouseLeave={() => {
                          if (!isPairingConflict || !isSelected) return;
                          if (conflictHoverTimeoutRef.current) {
                            window.clearTimeout(conflictHoverTimeoutRef.current);
                          }
                          conflictHoverTimeoutRef.current = window.setTimeout(() => {
                            setConflictPopoverCardId((prev) => (prev === card.id ? null : prev));
                          }, 200);
                        }}
                        onClick={(event) => {
                          if (isPairMode) {
                            if (isPairBacks) {
                              setSelectedIds((prev) => (prev.includes(card.id) ? [] : [card.id]));
                              return;
                            }
                            setSelectedIds((prev) => {
                              const next = prev.includes(card.id)
                                ? prev.filter((id) => id !== card.id)
                                : [...prev, card.id];
                              if (isPairingConflict && next.includes(card.id)) {
                                setConflictPopoverCardId(card.id);
                              } else if (isPairingConflict && !next.includes(card.id)) {
                                setConflictPopoverCardId((current) =>
                                  current === card.id ? null : current,
                                );
                              }
                              return next;
                            });
                            return;
                          }
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
                          if (isPairBacks) {
                            if (onConfirmSelection) {
                              onConfirmSelection([card.id]);
                            }
                            onClose();
                            return;
                          }
                          if (isPairMode) return;
                          if (!onLoadCard) return;
                          onLoadCard(card);
                          onClose();
                        }}
                      >
                        {isPairingConflict ? (
                          <div className={styles.cardsConflictIndicator}>
                            <AlertTriangle
                              className={styles.cardsConflictIcon}
                              aria-hidden="true"
                            />
                          </div>
                        ) : null}
                        {conflictPopoverCardId === card.id ? (
                          <div className={styles.cardsConflictOverlay}>
                            <div className={styles.cardsConflictPopover}>
                              <div className={styles.cardsConflictPopoverContent}>
                                <div className={styles.cardsConflictPopoverThumb}>
                                  {(() => {
                                    const conflictCard = cardById.get(card.id);
                                    const paired = conflictCard?.pairedWith
                                      ? cardById.get(conflictCard.pairedWith)
                                      : null;
                                    const pairedThumbUrl =
                                      typeof window !== "undefined" && paired?.thumbnailBlob
                                        ? URL.createObjectURL(paired.thumbnailBlob)
                                        : null;
                                    const pairedTemplateThumb = paired
                                      ? cardTemplatesById[paired.templateId]?.thumbnail
                                      : null;
                                    if (pairedThumbUrl) {
                                      return (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={pairedThumbUrl}
                                          alt=""
                                          onLoad={() => {
                                            URL.revokeObjectURL(pairedThumbUrl);
                                          }}
                                        />
                                      );
                                    }
                                    if (pairedTemplateThumb?.src) {
                                      return (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={pairedTemplateThumb.src} alt="" />
                                      );
                                    }
                                    return <div className={styles.cardsPairIndicatorPlaceholder} />;
                                  })()}
                                </div>
                                <div className={styles.cardsConflictPopoverText}>
                                  {t("warning.alreadyPairedWith")}
                                  <span>
                                    {(() => {
                                      const conflictCard = cardById.get(card.id);
                                      const paired = conflictCard?.pairedWith
                                        ? cardById.get(conflictCard.pairedWith)
                                        : null;
                                      return paired?.title ?? paired?.name ?? "Untitled card";
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {isPairMode ? null : (
                          <div className={styles.cardsItemHeader}>
                            <div className={styles.cardsItemName} title={card.name}>
                              {card.name}
                            </div>
                            <div
                              className={styles.cardsPairIndicator}
                              onMouseEnter={(event) => {
                                if (pairHoverTimeoutRef.current) {
                                  window.clearTimeout(pairHoverTimeoutRef.current);
                                }
                                const rect = event.currentTarget.getBoundingClientRect();
                                setPairPopoverAnchor({
                                  id: card.id,
                                  rect: {
                                    top: rect.top,
                                    left: rect.left,
                                    bottom: rect.bottom,
                                    right: rect.right,
                                  },
                                });
                                setHoveredPairCardId(card.id);
                              }}
                              onMouseLeave={() => {
                                if (pairHoverTimeoutRef.current) {
                                  window.clearTimeout(pairHoverTimeoutRef.current);
                                }
                                pairHoverTimeoutRef.current = window.setTimeout(() => {
                                  setHoveredPairCardId((prev) => (prev === card.id ? null : prev));
                                  setPairPopoverAnchor((prev) =>
                                    prev?.id === card.id ? null : prev,
                                  );
                                }, 200);
                              }}
                            >
                              {effectiveFace === "back" ? (
                                <div className={styles.cardsPairStack}>
                                  {visiblePairedFronts.map((paired, index) => {
                                    const stackThumbUrl =
                                      typeof window !== "undefined" && paired.thumbnailBlob
                                        ? URL.createObjectURL(paired.thumbnailBlob)
                                        : null;
                                    const stackTemplateThumb =
                                      cardTemplatesById[paired.templateId]?.thumbnail;
                                    return (
                                      <div
                                        key={paired.id}
                                        className={styles.cardsPairStackItem}
                                        style={{ zIndex: index + 1 }}
                                      >
                                        <div className={styles.cardsPairIndicatorInner}>
                                          {stackThumbUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={stackThumbUrl}
                                              alt=""
                                              onLoad={() => {
                                                URL.revokeObjectURL(stackThumbUrl);
                                              }}
                                            />
                                          ) : stackTemplateThumb?.src ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={stackTemplateThumb.src} alt="" />
                                          ) : (
                                            <div className={styles.cardsPairIndicatorPlaceholder} />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {pairedFrontsOverflow > 0 ? (
                                    <div
                                      className={styles.cardsPairStackItem}
                                      style={{ zIndex: visiblePairedFronts.length + 1 }}
                                    >
                                      <div className={styles.cardsPairStackOverflow}>
                                        +{pairedFrontsOverflow}
                                      </div>
                                    </div>
                                  ) : null}
                                  {pairedFronts.length === 0 ? (
                                    <div className={styles.cardsPairIndicatorInner}>
                                      <div className={styles.cardsPairIndicatorPlaceholder} />
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className={styles.cardsPairIndicatorInner}>
                                  {pairedThumbUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={pairedThumbUrl}
                                      alt=""
                                      onLoad={() => {
                                        URL.revokeObjectURL(pairedThumbUrl);
                                      }}
                                    />
                                  ) : pairedTemplateThumb?.src ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={pairedTemplateThumb.src} alt="" />
                                  ) : (
                                    <div className={styles.cardsPairIndicatorPlaceholder} />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                        {isPairMode ? null : (
                          <div className={styles.cardsItemMeta}>
                            <div
                              className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
                            >
                              {templateFilterLabelMap[card.templateId] ?? card.templateId}
                            </div>
                            <div className={styles.cardsItemDetails}>
                              {updatedLabel} {timeLabel}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalShell>
      {hoveredPairCardId && pairPopoverAnchor && typeof document !== "undefined"
        ? (() => {
            const hoveredCard = cardById.get(hoveredPairCardId) ?? null;
            if (!hoveredCard) return null;
            const hoveredTemplate = cardTemplatesById[hoveredCard.templateId];
            const hoveredFace = hoveredCard.face ?? hoveredTemplate?.defaultFace;
            const isHoveredBack = hoveredFace === "back";
            const hoveredPairedFronts = pairedByTargetId.get(hoveredCard.id) ?? [];
            const hoveredPairedCard = hoveredCard.pairedWith
              ? (cardById.get(hoveredCard.pairedWith) ?? null)
              : (hoveredPairedFronts[0] ?? null);
            const hoveredPairedThumbUrl =
              typeof window !== "undefined" && hoveredPairedCard?.thumbnailBlob
                ? URL.createObjectURL(hoveredPairedCard.thumbnailBlob)
                : null;
            const hoveredPairedTemplateThumb = hoveredPairedCard
              ? cardTemplatesById[hoveredPairedCard.templateId]?.thumbnail
              : null;
            const popoverColumns = 6;
            const tileWidth = 72;
            const tileHeight = 100;
            const tileGap = 6;
            const popoverPadding = 12;
            const isGridPopover = isHoveredBack && hoveredPairedFronts.length > 1;
            const popoverWidth = isGridPopover
              ? popoverPadding * 2 + popoverColumns * tileWidth + (popoverColumns - 1) * tileGap
              : popoverPadding * 2 + tileWidth;
            const popoverMaxHeight = isGridPopover ? 320 : popoverPadding * 2 + tileHeight;
            const left = Math.min(
              pairPopoverAnchor.rect.left,
              window.innerWidth - popoverWidth - 16,
            );
            const top = Math.min(
              pairPopoverAnchor.rect.bottom + 6,
              window.innerHeight - popoverMaxHeight - 16,
            );

            return createPortal(
              <div
                className={
                  isGridPopover
                    ? styles.cardsPairStackPopoverGrid
                    : styles.cardsPairStackPopoverSingle
                }
                aria-hidden="true"
                style={{ left, top }}
                onMouseEnter={() => {
                  if (pairHoverTimeoutRef.current) {
                    window.clearTimeout(pairHoverTimeoutRef.current);
                  }
                  setHoveredPairCardId(hoveredPairCardId);
                }}
                onMouseLeave={() => {
                  if (pairHoverTimeoutRef.current) {
                    window.clearTimeout(pairHoverTimeoutRef.current);
                  }
                  pairHoverTimeoutRef.current = window.setTimeout(() => {
                    setHoveredPairCardId(null);
                    setPairPopoverAnchor(null);
                  }, 200);
                }}
              >
                {isHoveredBack ? (
                  hoveredPairedFronts.length ? (
                    <div
                      className={
                        isGridPopover ? styles.cardsPairStackGrid : styles.cardsPairStackGridSingle
                      }
                    >
                      {hoveredPairedFronts
                        .slice(0, isGridPopover ? hoveredPairedFronts.length : 1)
                        .map((paired) => {
                          const gridThumbUrl =
                            typeof window !== "undefined" && paired.thumbnailBlob
                              ? URL.createObjectURL(paired.thumbnailBlob)
                              : null;
                          const gridTemplateThumb = cardTemplatesById[paired.templateId]?.thumbnail;
                          return (
                            <div key={paired.id} className={styles.cardsPairStackGridItem}>
                              {gridThumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={gridThumbUrl}
                                  alt=""
                                  onLoad={() => {
                                    URL.revokeObjectURL(gridThumbUrl);
                                  }}
                                />
                              ) : gridTemplateThumb?.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={gridTemplateThumb.src} alt="" />
                              ) : (
                                <div className={styles.cardsPairIndicatorPlaceholder} />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className={styles.cardsPairStackGridSingle}>
                      <div
                        className={`${styles.cardsPairStackGridItem} ${styles.cardsPairStackGridItemEmpty}`}
                      >
                        <div className={styles.cardsPairIndicatorEmpty}>
                          {t("warning.notPaired")}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className={styles.cardsPairStackGridSingle}>
                    <div
                      className={`${styles.cardsPairStackGridItem} ${
                        hoveredPairedCard ? "" : styles.cardsPairStackGridItemEmpty
                      }`}
                    >
                      {hoveredPairedCard ? (
                        hoveredPairedThumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={hoveredPairedThumbUrl}
                            alt=""
                            onLoad={() => {
                              URL.revokeObjectURL(hoveredPairedThumbUrl);
                            }}
                          />
                        ) : hoveredPairedTemplateThumb?.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hoveredPairedTemplateThumb.src} alt="" />
                        ) : (
                          <div className={styles.cardsPairIndicatorPlaceholder} />
                        )
                      ) : (
                        <div className={styles.cardsPairIndicatorEmpty}>
                          {t("warning.notPaired")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>,
              document.body,
            );
          })()
        : null}
      {pairingConflictDialog ? (
        <ConfirmModal
          isOpen={Boolean(pairingConflictDialog)}
          title={t("actions.confirm")}
          confirmLabel={t("actions.confirm")}
          cancelLabel={t("actions.cancel")}
          onConfirm={async () => {
            const handler = pairingConflictDialog.onConfirm;
            setPairingConflictDialog(null);
            await handler();
          }}
          onCancel={() => {
            setPairingConflictDialog(null);
          }}
        >
          {(() => {
            const backTitle = activeBackId
              ? (cardById.get(activeBackId)?.title ??
                cardById.get(activeBackId)?.name ??
                "Back card")
              : "Back card";
            return pairingConflictDialog.count === 1
              ? formatMessageWith("warning.pairingLossSingle", { back: backTitle })
              : formatMessageWith("warning.pairingLossMultiple", {
                  count: pairingConflictDialog.count,
                  back: backTitle,
                });
          })()}
          <div className={styles.pairingConflictGrid}>
            {pairingConflictDialog.cardIds.map((id) => {
              const conflictCard = cardById.get(id);
              if (!conflictCard) return null;
              const thumbUrl =
                typeof window !== "undefined" && conflictCard.thumbnailBlob
                  ? URL.createObjectURL(conflictCard.thumbnailBlob)
                  : null;
              const templateThumb = cardTemplatesById[conflictCard.templateId]?.thumbnail ?? null;
              return (
                <div key={id} className={styles.pairingConflictItem}>
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt=""
                      onLoad={() => {
                        URL.revokeObjectURL(thumbUrl);
                      }}
                    />
                  ) : templateThumb?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={templateThumb.src} alt="" />
                  ) : (
                    <div className={styles.cardsPairIndicatorPlaceholder} />
                  )}
                </div>
              );
            })}
          </div>
        </ConfirmModal>
      ) : null}
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
                <div className={styles.exportProgressFill} style={{ width: `${exportPercent}%` }} />
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
                {exportCancelled ? t("actions.cancelling") : t("actions.cancel")}
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
                {collectionFormMode === "edit"
                  ? t("heading.editCollection")
                  : t("heading.newCollection")}
              </h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsCollectionModalOpen(false)}
              >
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
                  if (collectionFormMode === "edit" && activeFilter.type === "collection") {
                    if (collection.id === activeFilter.id) return false;
                  }
                  return collection.name.toLocaleLowerCase() === normalized;
                });
                if (conflict) {
                  setCollectionNameError(t("errors.collectionNameExists"));
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
                {collectionFormMode === "edit" ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={async () => {
                      if (activeFilter.type !== "collection") return;
                      setConfirmDialog({
                        title: t("confirm.deleteCollectionTitle"),
                        body: `${t("confirm.deleteCollectionBodyPrefix")} "${collectionName}"? ${t(
                          "confirm.deleteCollectionBodySuffix",
                        )}`,
                        confirmLabel: t("actions.delete"),
                        onConfirm: async () => {
                          try {
                            await deleteCollection(activeFilter.id);
                            const refreshed = await listCollections();
                            setCollections(refreshed);
                            setActiveFilter({ type: "all" });
                            if (typeof window !== "undefined") {
                              window.localStorage.removeItem("hqcc.selectedCollectionId");
                            }
                            setIsCollectionModalOpen(false);
                            setCollectionName("");
                            setCollectionDescription("");
                          } catch (error) {
                            // eslint-disable-next-line no-console
                            console.error("[StockpileModal] Failed to delete collection", error);
                          } finally {
                            setConfirmDialog(null);
                          }
                        },
                      });
                    }}
                  >
                    {t("actions.delete")}
                  </button>
                ) : null}
                <button type="submit" className="btn btn-primary btn-sm">
                  {collectionFormMode === "edit" ? t("actions.save") : t("actions.create")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsCollectionModalOpen(false)}
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isAddModalOpen ? (
        <div className={styles.stockpileOverlayBackdrop} onClick={() => setIsAddModalOpen(false)}>
          <div
            className={styles.stockpileOverlayPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.stockpileOverlayHeader}>
              <h3 className={styles.stockpileOverlayTitle}>{t("heading.addToCollection")}</h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                <span className="visually-hidden">{t("actions.close")}</span>✕
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
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      >
        {confirmDialog?.body ?? ""}
      </ConfirmModal>
    </>
  );
}
