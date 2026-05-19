"use client";

import { useMemo } from "react";

import styles from "@/app/page.module.css";
import { DeckDetailSelectionProvider } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import {
  DeckRightPanelProvider,
  useDeckRightPanel,
} from "@/components/Decks/detail/context/DeckRightPanelContext";
import { DeckSetEntriesProvider } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import DeckBacksPanel from "@/components/Decks/detail/DeckBacksPanel";
import DeckDetailHeader from "@/components/Decks/detail/DeckDetailHeader";
import DeckDetailModals from "@/components/Decks/detail/DeckDetailModals";
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
import DeckGroupsBoardController, {
  DeckEntriesBoardController,
  DeckMockDndProvider,
  DeckSourceBoardController,
} from "./detail/DeckGroupsSection2";
import { useDeckBoardsModels } from "./detail/DeckGroupsSection2.models";

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
  const { deckTitle, keySetId } = useDeckHeaderModel(deckId);

  return (
    <DeckRightPanelProvider>
      <DeckDetailPanelContent
        deckId={deckId}
        deckTitle={deckTitle}
        keySetId={keySetId}
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
  keySetId,
  actions,
  drag,
  dndProps,
  modalState,
  modalActions,
  selectionModel,
  entriesModel,
}: {
  deckId: string | null;
  deckTitle: string;
  keySetId: string | null;
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
  const boardModels = useDeckBoardsModels({
    selection: selectionModel,
    entries: entriesModel,
  });

  return (
    <>
      <DeckMockDndProvider boardModels={boardModels}>
        <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
          <div className={styles.deckRoutePanel}>
            <DeckDetailHeader
              deckId={deckId}
              deckTitle={deckTitle}
            />

            <DeckDetailSelectionProvider model={selectionModel}>
              <DeckSetEntriesProvider model={entriesModel}>
                <div className={styles.deckRouteMiddle}>
                  <DeckGroupsBoardController deckId={deckId} keySetId={keySetId} />
                  <DeckEntriesBoardController onOpenCardEditor={actions.onOpenCardEditor} />
                </div>
              </DeckSetEntriesProvider>
            </DeckDetailSelectionProvider>
          </div>
        </section>
        <aside
          className={`${styles.rightPanel} ${styles.decksRightPanel} ${
            isRightPanelVisible ? styles.decksRightPanelExpanded : styles.decksRightPanelCollapsed
          }`}
        >
          <DeckBacksPanel
            usedBackFaceIds={usedBackFaceIds}
            usedFrontFaceIds={usedFrontFaceIds}
            finalizingBackFaceId={drag.finalizingBackFaceId}
            finalizingFrontFaceId={drag.finalizingFrontFaceId}
            gridOverride={<DeckSourceBoardController />}
          />
        </aside>
      </DeckMockDndProvider>

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
