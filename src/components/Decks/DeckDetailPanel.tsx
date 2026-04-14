"use client";

import { DndContext, DragOverlay, pointerWithin, useDroppable } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { ChevronLeft, ChevronRight, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";
import styles from "@/app/page.module.css";
import { CARD_FAN_SIZES } from "@/components/Decks/CardFan";
import DeckGroupGridList from "@/components/Decks/DeckGroupGridList";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import type { TFunction } from "@/i18n/types";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  DndContextProps,
} from "@dnd-kit/core";
import type { ReactNode } from "react";

type DeckDetailPanelProps = {
  t: TFunction;
  deckId: string | null;
  activeDeck: DeckRecord | null;
  orderedGroups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  selectedGroupId: string | null;
  selectedGroup: DeckGroupRecord | null;
  selectedGroupSets: DeckSetRecord[];
  selectedSetId: string | null;
  entries: DeckEntryRecord[];
  pairsById: Map<string, PairRecord>;
  selectedEntryIds: Set<string>;
  setSelectedEntryIds: (updater: (prev: Set<string>) => Set<string>) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectSet: (set: DeckSetRecord) => void;
  setIsDeleteDeckOpen: (value: boolean) => void;
  setIsDeleteSetOpen: (value: boolean) => void;
  setIsDeleteGroupOpen: (value: boolean) => void;
  setPendingDeleteSet: (value: DeckSetRecord | null) => void;
  setPendingDeleteGroup: (value: DeckGroupRecord | null) => void;
  setIsRebuildConfirmOpen: (value: boolean) => void;
  setPendingRebuildSetId: (value: string | null) => void;
  isDeleteDeckOpen: boolean;
  isDeleteSetOpen: boolean;
  isDeleteGroupOpen: boolean;
  isRebuildConfirmOpen: boolean;
  pendingRebuildSetId: string | null;
  dragState: {
    dragActiveSetId: string | null;
    dragActiveGroupId: string | null;
    dragActiveBackFaceId: string | null;
    dragActiveFrontFaceId: string | null;
    groupDropIndex: number | null;
    setDropIndex: number | null;
    setDropGroupId: string | null;
    isGroupDropOver: boolean;
    isFrontDropOver: boolean;
    isRemoveZone: boolean;
    isBackFaceDragActive: boolean;
    isFrontFaceDragActive: boolean;
    isGroupDragActive: boolean;
    isSetDragActive: boolean;
    faceDropSucceeded: boolean;
  };
  groupRowRef: (node: HTMLDivElement | null) => void;
  dndProps: {
    sensors: DndContextProps["sensors"];
    onDragStart: (event: DragStartEvent) => void;
    onDragMove: (event: DragMoveEvent) => void;
    onDragOver: (event: DragOverEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onDragCancel: () => void;
  };
  isRightPanelVisible: boolean;
  setIsRightPanelVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  handleDuplicateDeck: (deckId: string) => void;
  handleDeleteSet: () => void;
  handleDeleteGroup: () => void;
  startRebuildFlow: () => void;
  navigateToDecks: () => void;
  onOpenCardEditor: (cardId: string) => void;
  deckPreviewVariant: "xs" | "sm" | "smMd" | "lg";
  groupTileVariant: "xs" | "sm" | "smMd" | "lg";
  setById: Map<string, DeckSetRecord>;
  deckEntryThumb: (cardId: string, isSelected: boolean) => ReactNode;
  addFrontToSet: (setId: string, frontFaceId: string) => Promise<void>;
  removeEntry: (entryId: string, setId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  deckSetTile: (set: DeckSetRecord, isSelected: boolean, onSelect: () => void) => ReactNode;
  deckSetThumb: (cardId: string) => ReactNode;
  backPanelThumb: (cardId: string) => ReactNode;
  backCardsByCollection: ReactNode;
};

export default function DeckDetailPanel(props: DeckDetailPanelProps) {
  const {
    t,
    deckId,
    activeDeck,
    orderedGroups,
    sets,
    selectedGroupId,
    selectedGroup,
    selectedGroupSets,
    selectedSetId,
    entries,
    pairsById,
    selectedEntryIds,
    setSelectedEntryIds,
    onSelectGroup,
    onSelectSet,
    setIsDeleteDeckOpen,
    setIsDeleteSetOpen,
    setIsDeleteGroupOpen,
    setPendingDeleteSet,
    setPendingDeleteGroup,
    setIsRebuildConfirmOpen,
    setPendingRebuildSetId,
    isDeleteDeckOpen,
    isDeleteSetOpen,
    isDeleteGroupOpen,
    isRebuildConfirmOpen,
    pendingRebuildSetId,
    dragState,
    groupRowRef,
    dndProps,
    isRightPanelVisible,
    setIsRightPanelVisible,
    handleDuplicateDeck,
    handleDeleteSet,
    handleDeleteGroup,
    startRebuildFlow,
    navigateToDecks,
    onOpenCardEditor,
    deckPreviewVariant,
    groupTileVariant,
    setById,
    deckEntryThumb,
    addFrontToSet,
    removeEntry,
    deleteDeck,
    deckSetTile,
    deckSetThumb,
    backPanelThumb,
    backCardsByCollection,
  } = props;

  const {
    dragActiveSetId,
    dragActiveBackFaceId,
    dragActiveFrontFaceId,
    groupDropIndex,
    setDropIndex,
    setDropGroupId,
    isGroupDropOver,
    isFrontDropOver,
    isRemoveZone,
    isBackFaceDragActive,
    isFrontFaceDragActive,
    isGroupDragActive,
    isSetDragActive,
    faceDropSucceeded,
  } = dragState;
  const { setNodeRef: setEntriesDropRef } = useDroppable({ id: "entries-area" });

  const entriesSorted = useMemo(
    () => entries.slice().sort((a, b) => a.sortIndex - b.sortIndex),
    [entries],
  );
  const [entriesViewMode, setEntriesViewMode] = useState<"in-set" | "paired-not-in-set">("in-set");
  const selectedSet = useMemo(
    () => (selectedSetId ? (setById.get(selectedSetId) ?? null) : null),
    [selectedSetId, setById],
  );
  const pairedNotInSetFrontIds = useMemo(() => {
    if (!selectedSet) return [];
    const entryPairIds = new Set(entries.map((entry) => entry.pairId));
    const frontIds: string[] = [];
    pairsById.forEach((pair) => {
      if (!pair.frontFaceId || !pair.backFaceId) return;
      if (pair.backFaceId !== selectedSet.backFaceId) return;
      if (entryPairIds.has(pair.id)) return;
      frontIds.push(pair.frontFaceId);
    });
    return frontIds;
  }, [entries, pairsById, selectedSet]);
  useEffect(() => {
    setEntriesViewMode("in-set");
  }, [selectedSetId]);
  const entryDropTileSize = CARD_FAN_SIZES[deckPreviewVariant];

  return (
    <>
      <DndContext
        sensors={dndProps.sensors}
        collisionDetection={pointerWithin}
        onDragStart={dndProps.onDragStart}
        onDragMove={dndProps.onDragMove}
        onDragOver={dndProps.onDragOver}
        onDragEnd={dndProps.onDragEnd}
        onDragCancel={dndProps.onDragCancel}
      >
        <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
          <div className={styles.deckRoutePanel}>
            <div className={styles.deckRouteToolbar}>
              <button type="button" className={styles.deckBreadcrumb} onClick={navigateToDecks}>
                {t("actions.decks")}
              </button>
              <span className={styles.deckBreadcrumbDivider}>›</span>
              <div className={styles.deckBreadcrumbTitle}>
                {activeDeck?.title ?? t("decks.untitledDeck")}
              </div>
              <div className={styles.deckHeaderActions}>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => deckId && handleDuplicateDeck(deckId)}
                  disabled={!deckId}
                >
                  <Copy size={14} />
                  {t("actions.duplicate")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setIsDeleteDeckOpen(true)}
                  disabled={!deckId}
                >
                  <Trash2 size={14} />
                  {t("actions.delete")}
                </button>
              </div>
            </div>

            <div className={styles.deckRouteDetailsRow} />

            <div className={styles.deckRouteMiddle}>
              <div className={styles.deckRouteRow}>
                <div className={styles.deckRouteRowBody}>
                <div className={styles.deckGroupRow}>
                  <DeckGroupGridList
                    groups={orderedGroups}
                    sets={sets}
                    selectedGroupId={selectedGroupId}
                    selectedSetId={selectedSetId}
                    isDropOver={isGroupDropOver}
                    isBackFaceDragActive={isBackFaceDragActive}
                    isGroupDragActive={isGroupDragActive}
                    isSetDragActive={isSetDragActive}
                    dropIndex={groupDropIndex}
                    setDropIndex={setDropIndex}
                    setDropGroupId={setDropGroupId}
                    isRemoveZone={isRemoveZone}
                    emptyLabel={t("decks.emptyGroups")}
                    onSelectGroup={onSelectGroup}
                    onSelectSet={onSelectSet}
                    groupTileVariant={groupTileVariant}
                    rowRef={groupRowRef}
                  />
                    <div className={styles.deckGroupRowToolbar}>
                      <button
                        type="button"
                        className={styles.deckIconButton}
                        onClick={() => setIsRightPanelVisible((prev) => !prev)}
                        title={t("decks.addGroup")}
                      >
                        {isRightPanelVisible ? (
                          <ChevronRight size={16} />
                        ) : (
                          <ChevronLeft size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.deckRouteRowFooter} />
              </div>

              <div className={styles.deckRouteRow}>
                <div className={styles.deckRouteRowToolbar} />
                <div className={styles.deckRouteRowBody}>
                  {!selectedGroup ? (
                    <div className={styles.decksEmpty}>CARDS GO HERE</div>
                  ) : (
                    <>
                      {null}
                      {!selectedSetId ? (
                        <div className={styles.decksEmpty}>{t("decks.noSetSelected")}</div>
                      ) : (
                        <div
                          ref={setEntriesDropRef}
                          data-deck-entries-dropzone="true"
                          className={`${styles.deckEntriesPanel} ${
                            isFrontFaceDragActive ? styles.deckEntriesPanelDropActive : ""
                          } ${isFrontDropOver ? styles.deckEntriesPanelDropOver : ""}`}
                          style={{
                            ["--deck-set-w" as string]: `${entryDropTileSize.width}px`,
                            ["--deck-set-h" as string]: `${entryDropTileSize.height}px`,
                          }}
                        >
                          <div className={styles.deckFacesSegment} role="tablist" aria-label="Set cards mode">
                            <button
                              type="button"
                              className={`${styles.deckFacesSegmentBtn} ${
                                entriesViewMode === "in-set" ? styles.deckFacesSegmentBtnActive : ""
                              }`}
                              aria-pressed={entriesViewMode === "in-set"}
                              onClick={() => setEntriesViewMode("in-set")}
                            >
                              In Set ({entriesSorted.length})
                            </button>
                            <button
                              type="button"
                              className={`${styles.deckFacesSegmentBtn} ${
                                entriesViewMode === "paired-not-in-set" ? styles.deckFacesSegmentBtnActive : ""
                              }`}
                              aria-pressed={entriesViewMode === "paired-not-in-set"}
                              onClick={() => setEntriesViewMode("paired-not-in-set")}
                            >
                              Paired (Not In Set) ({pairedNotInSetFrontIds.length})
                            </button>
                          </div>
                          {isFrontFaceDragActive ? (
                            <div
                              className={`${styles.deckEntriesDropPlaceholder} ${
                                isFrontDropOver ? styles.deckEntriesDropPlaceholderOver : ""
                              }`}
                              aria-hidden="true"
                            />
                          ) : null}
                          {entriesViewMode === "paired-not-in-set" ? (
                            pairedNotInSetFrontIds.length === 0 ? (
                              <div className={styles.decksEmpty}>No paired cards pending add.</div>
                            ) : (
                              <div className={styles.deckEntriesGrid}>
                                {pairedNotInSetFrontIds.map((frontId) => (
                                  <div key={frontId} className={styles.deckEntryCard}>
                                    <button
                                      type="button"
                                      className={styles.deckEntrySelect}
                                      onClick={async () => {
                                        if (!selectedSetId) return;
                                        await addFrontToSet(selectedSetId, frontId);
                                      }}
                                    >
                                      {deckEntryThumb(frontId, false)}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : entriesSorted.length === 0 ? (
                            <div className={styles.decksEmpty}>{t("decks.emptyEntries")}</div>
                          ) : (
                            <div className={styles.deckEntriesGrid}>
                              {entriesSorted.map((entry) => {
                                const pair = pairsById.get(entry.pairId);
                                const frontId = pair?.frontFaceId ?? null;
                                const isSelected = selectedEntryIds.has(entry.id);
                                if (!frontId) {
                                  return (
                                    <div key={entry.id} className={styles.deckEntryMissing}>
                                      <div>{t("decks.missingEntry")}</div>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={async () => {
                                          await removeEntry(entry.id, entry.setId);
                                          setSelectedEntryIds(() => new Set());
                                        }}
                                      >
                                        {t("actions.remove")}
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={entry.id} className={styles.deckEntryCard}>
                                    <button
                                      type="button"
                                      className={styles.deckEntrySelect}
                                      onClick={(event) => {
                                        const hasModifier = event.metaKey || event.ctrlKey;
                                        setSelectedEntryIds((prev) => {
                                          const next = new Set(prev);
                                          if (hasModifier) {
                                            if (next.has(entry.id)) next.delete(entry.id);
                                            else next.add(entry.id);
                                          } else if (next.size === 1 && next.has(entry.id)) {
                                            next.clear();
                                          } else {
                                            next.clear();
                                            next.add(entry.id);
                                          }
                                          return next;
                                        });
                                      }}
                                      onDoubleClick={() => frontId && onOpenCardEditor(frontId)}
                                    >
                                      {deckEntryThumb(frontId, isSelected)}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className={styles.deckRouteRowFooter} />
              </div>
              <DragOverlay
                modifiers={dragActiveBackFaceId || dragActiveFrontFaceId ? [snapCenterToCursor] : undefined}
                dropAnimation={(dragActiveBackFaceId || dragActiveFrontFaceId) && faceDropSucceeded ? null : undefined}
              >
                {dragActiveBackFaceId ? (
                  <div className={styles.deckBacksDragOverlay}>
                    {backPanelThumb(dragActiveBackFaceId)}
                  </div>
                ) : dragActiveFrontFaceId ? (
                  <div className={styles.deckBacksDragOverlay}>
                    {backPanelThumb(dragActiveFrontFaceId)}
                  </div>
                ) : dragActiveSetId ? (
                  <div
                    className={`${styles.deckSetTileOverlay} ${
                      isRemoveZone ? styles.deckSetTileOverlayRemove : ""
                    }`}
                  >
                    {(() => {
                      const set = setById.get(dragActiveSetId);
                      if (!set) return null;
                      return deckSetThumb(set.backFaceId);
                    })()}
                    {isRemoveZone ? (
                      <div className={styles.deckSetRemoveBadge}>×</div>
                    ) : null}
                  </div>
                ) : null}
              </DragOverlay>
            </div>

            <div className={styles.deckRouteFooter} />
          </div>
        </section>
        {isRightPanelVisible ? (
          <aside className={`${styles.rightPanel} ${styles.decksRightPanel}`}>
            {backCardsByCollection}
          </aside>
        ) : null}
      </DndContext>
      <ConfirmModal
        isOpen={isDeleteDeckOpen}
        title={t("decks.deleteDeckTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          if (!deckId) return;
          setIsDeleteDeckOpen(false);
          await deleteDeck(deckId);
          navigateToDecks();
        }}
        onCancel={() => setIsDeleteDeckOpen(false)}
      >
        <div>{t("decks.deleteDeckBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={isDeleteSetOpen}
        title={t("decks.deleteSetTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleDeleteSet}
        onCancel={() => {
          setPendingDeleteSet(null);
          setIsDeleteSetOpen(false);
        }}
      >
        <div>{t("decks.deleteSetBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={isDeleteGroupOpen}
        title={t("decks.deleteGroupTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleDeleteGroup}
        onCancel={() => {
          setPendingDeleteGroup(null);
          setIsDeleteGroupOpen(false);
        }}
      >
        <div>{t("decks.deleteGroupBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={isRebuildConfirmOpen}
        title={t("decks.changeBackConfirmTitle")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onConfirm={startRebuildFlow}
        onCancel={() => {
          setIsRebuildConfirmOpen(false);
          setPendingRebuildSetId(null);
        }}
      >
        <div>{t("decks.changeBackConfirmBody")}</div>
      </ConfirmModal>
    </>
  );
}
