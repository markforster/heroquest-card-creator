import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  DndContextProps,
} from "@dnd-kit/core";

export type DeckDetailDragState = {
  dragActiveSetId: string | null;
  dragActiveGroupId: string | null;
  dragActiveBackFaceId: string | null;
  dragActiveFrontFaceId: string | null;
  dragActiveEntryId: string | null;
  dragTargetGroupId: string | null;
  backFaceDropGroupId: string | null;
  backFaceDropIndex: number | null;
  isBackFaceNewGroupEdgeTarget: boolean;
  groupDropIndex: number | null;
  setDropIndex: number | null;
  setDropGroupId: string | null;
  entryDropIndex: number | null;
  isGroupDropOver: boolean;
  isFrontDropOver: boolean;
  isEntriesDropOver: boolean;
  isRemoveZone: boolean;
  isBackFaceDragActive: boolean;
  isFrontFaceDragActive: boolean;
  isEntryDragActive: boolean;
  isGroupDragActive: boolean;
  isSetDragActive: boolean;
  faceDropSucceeded: boolean;
  finalizingEntryId: string | null;
  finalizingSetId: string | null;
  finalizingFrontFaceId: string | null;
  finalizingBackFaceId: string | null;
};

export type DeckDetailDndProps = {
  sensors: DndContextProps["sensors"];
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
};

export type DeckDetailActionHandlers = {
  handleDeleteSet: () => Promise<void>;
  handleDeleteGroup: () => Promise<void>;
  startRebuildFlow: () => void;
  navigateToDecks: () => void;
  onOpenCardEditor: (cardId: string) => void;
  deleteSetFromGroupCard: (setId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
};

export type DeckDetailModalState = {
  isDeleteDeckOpen: boolean;
  isDeleteSetOpen: boolean;
  isDeleteGroupOpen: boolean;
  isRebuildConfirmOpen: boolean;
};

export type DeckDetailModalActions = {
  setIsDeleteDeckOpen: (value: boolean) => void;
  setIsDeleteSetOpen: (value: boolean) => void;
  setIsDeleteGroupOpen: (value: boolean) => void;
  setPendingDeleteSet: (value: DeckSetRecord | null) => void;
  setPendingDeleteGroup: (value: DeckGroupRecord | null) => void;
  setIsRebuildConfirmOpen: (value: boolean) => void;
  setPendingRebuildSetId: (value: string | null) => void;
};
