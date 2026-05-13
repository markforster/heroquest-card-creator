"use client";

import { DndContext, closestCenter, pointerWithin } from "@dnd-kit/core";
import { useMemo } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { DeckDetailSelectionProvider } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import {
  DeckRightPanelProvider,
  useDeckRightPanel,
} from "@/components/Decks/detail/context/DeckRightPanelContext";
import { DeckSetEntriesProvider } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import DeckBacksPanel, { DeckBacksOverlayThumb } from "@/components/Decks/detail/DeckBacksPanel";
import DeckDetailHeader from "@/components/Decks/detail/DeckDetailHeader";
import DeckDetailModals from "@/components/Decks/detail/DeckDetailModals";
import DeckDragOverlay from "@/components/Decks/detail/DeckDragOverlay";
import DeckEntriesSection from "@/components/Decks/detail/DeckEntriesSection";
import DeckGroupsSection from "@/components/Decks/detail/DeckGroupsSection";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckHeaderModel } from "@/components/Decks/hooks/useDeckHeaderModel";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import type {
  DeckDetailActionHandlers,
  DeckDetailDndProps,
  DeckDetailDragState,
  DeckDetailModalActions,
  DeckDetailModalState,
} from "@/components/Decks/types/deck-detail";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

const SET_TILE_VARIANT = "smMd";
const GROUP_TILE_VARIANT = "smMd";
const BACK_PANEL_DRAG_VARIANT = "smMd";

function DeckEntryThumb({ cardId, isSelected }: { cardId: string; isSelected: boolean }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <div className={`${styles.deckEntryThumb} ${isSelected ? styles.deckEntryThumbSelected : ""}`}>
      <CardThumbnail
        src={thumbUrl}
        alt=""
        variant={SET_TILE_VARIANT}
        fit="cover"
        className={styles.deckEntryThumbFrame}
        fallback={<div className={styles.deckPreviewThumbFallback} />}
      />
    </div>
  );
}

function DeckSetThumb({ cardId }: { cardId: string }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={SET_TILE_VARIANT}
      fit="cover"
      className={styles.deckSetThumb}
      fallback={<div className={styles.deckSetThumbFallback} />}
    />
  );
}

export type DeckDetailPanelProps = {
  deckId: string | null;
  actions: DeckDetailActionHandlers;
  drag: DeckDetailDragState;
  dndProps: DeckDetailDndProps;
  modalState: DeckDetailModalState;
  modalActions: DeckDetailModalActions;
  groupRowRef: (node: HTMLDivElement | null) => void;
  entriesRowRef: (node: HTMLDivElement | null) => void;
  selectionModel: DeckDetailSelectionModel;
  entriesModel: DeckSetEntriesModel;
};

export default function DeckDetailPanel({
  deckId,
  actions,
  drag,
  dndProps,
  modalState,
  modalActions,
  groupRowRef,
  entriesRowRef,
  selectionModel,
  entriesModel,
}: DeckDetailPanelProps) {
  const { deckTitle } = useDeckHeaderModel(deckId);

  return (
    <DeckRightPanelProvider>
      <DeckDetailPanelContent
        deckId={deckId}
        deckTitle={deckTitle}
        actions={actions}
        drag={drag}
        dndProps={dndProps}
        modalState={modalState}
        modalActions={modalActions}
        groupRowRef={groupRowRef}
        entriesRowRef={entriesRowRef}
        selectionModel={selectionModel}
        entriesModel={entriesModel}
      />
    </DeckRightPanelProvider>
  );
}

function DeckDetailPanelContent({
  deckId,
  deckTitle,
  actions,
  drag,
  dndProps,
  modalState,
  modalActions,
  groupRowRef,
  entriesRowRef,
  selectionModel,
  entriesModel,
}: {
  deckId: string | null;
  deckTitle: string;
  actions: DeckDetailActionHandlers;
  drag: DeckDetailDragState;
  dndProps: DeckDetailDndProps;
  modalState: DeckDetailModalState;
  modalActions: DeckDetailModalActions;
  groupRowRef: (node: HTMLDivElement | null) => void;
  entriesRowRef: (node: HTMLDivElement | null) => void;
  selectionModel: DeckDetailSelectionModel;
  entriesModel: DeckSetEntriesModel;
}) {
  const { isRightPanelVisible } = useDeckRightPanel();
  const usedBackFaceIds = useMemo(
    () => new Set(selectionModel.sets.map((set) => set.backFaceId)),
    [selectionModel.sets],
  );
  const usedFrontFaceIds = useMemo(
    () =>
      new Set(
        entriesModel.entries
          .map((entry) => entriesModel.entryFrontIdByEntryId.get(entry.id) ?? null)
          .filter((id): id is string => Boolean(id)),
      ),
    [entriesModel.entries, entriesModel.entryFrontIdByEntryId],
  );
  return (
    <>
      <DndContext
        sensors={dndProps.sensors}
        collisionDetection={
          drag.isFrontFaceDragActive || drag.isEntryDragActive ? closestCenter : pointerWithin
        }
        onDragStart={dndProps.onDragStart}
        onDragMove={dndProps.onDragMove}
        onDragOver={dndProps.onDragOver}
        onDragEnd={dndProps.onDragEnd}
        onDragCancel={dndProps.onDragCancel}
      >
        <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
          <div className={styles.deckRoutePanel}>
            <DeckDetailHeader deckId={deckId} deckTitle={deckTitle} />

            {/* <div className={styles.deckRouteDetailsRow} /> */}

            <DeckDetailSelectionProvider model={selectionModel}>
              <DeckSetEntriesProvider model={entriesModel}>
                <div className={styles.deckRouteMiddle}>
                  <DeckGroupsSection
                    groupTileVariant={GROUP_TILE_VARIANT}
                    drag={drag}
                    rowRef={groupRowRef}
                    onDeleteSetFromGroupCard={actions.deleteSetFromGroupCard}
                  />

                  <DeckEntriesSection
                    drag={drag}
                    entriesRowRef={entriesRowRef}
                    onOpenCardEditor={actions.onOpenCardEditor}
                    deckEntryThumb={(cardId, isSelected) => (
                      <DeckEntryThumb cardId={cardId} isSelected={isSelected} />
                    )}
                  />

                  <DeckDragOverlay
                    drag={drag}
                    setById={selectionModel.setById}
                    deckEntryThumb={(cardId, isSelected) => (
                      <DeckEntryThumb cardId={cardId} isSelected={isSelected} />
                    )}
                    deckSetThumb={(cardId) => <DeckSetThumb cardId={cardId} />}
                    backPanelThumb={(cardId) => (
                      <DeckBacksOverlayThumb cardId={cardId} variant={BACK_PANEL_DRAG_VARIANT} />
                    )}
                  />
                </div>
              </DeckSetEntriesProvider>
            </DeckDetailSelectionProvider>

          </div>
        </section>
        {isRightPanelVisible ? (
          <aside className={`${styles.rightPanel} ${styles.decksRightPanel}`}>
            <DeckBacksPanel
              usedBackFaceIds={usedBackFaceIds}
              usedFrontFaceIds={usedFrontFaceIds}
            />
          </aside>
        ) : null}
      </DndContext>

      <DeckDetailModals
        deckId={deckId}
        state={modalState}
        actions={modalActions}
        onDeleteDeck={actions.deleteDeck}
        onDeleteSet={actions.handleDeleteSet}
        onDeleteGroup={actions.handleDeleteGroup}
        onRebuildConfirm={actions.startRebuildFlow}
        onNavigateToDecks={actions.navigateToDecks}
      />
    </>
  );
}
