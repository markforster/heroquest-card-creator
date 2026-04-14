"use client";

import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { ChevronLeft, ChevronRight, Copy, Trash2 } from "lucide-react";
import { useMemo } from "react";

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
    dragActiveBackFaceId: string | null;
    groupDropIndex: number | null;
    isGroupDropOver: boolean;
    isBackFaceDragActive: boolean;
    backFaceDropSucceeded: boolean;
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
    groupDropIndex,
    isGroupDropOver,
    isBackFaceDragActive,
    backFaceDropSucceeded,
  } = dragState;

  const entriesSorted = useMemo(
    () => entries.slice().sort((a, b) => a.sortIndex - b.sortIndex),
    [entries],
  );

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
                    dropIndex={groupDropIndex}
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
                        <div className={styles.deckEntriesPanel}>
                          {entriesSorted.length === 0 ? (
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
                modifiers={dragActiveBackFaceId ? [snapCenterToCursor] : undefined}
                dropAnimation={
                  dragActiveBackFaceId && backFaceDropSucceeded ? null : undefined
                }
              >
                {dragActiveBackFaceId ? (
                  <div className={styles.deckBacksDragOverlay}>
                    {backPanelThumb(dragActiveBackFaceId)}
                  </div>
                ) : dragActiveSetId ? (
                  <div className={styles.deckSetTileOverlay}>
                    {(() => {
                      const set = setById.get(dragActiveSetId);
                      if (!set) return null;
                      return deckSetThumb(set.backFaceId);
                    })()}
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
