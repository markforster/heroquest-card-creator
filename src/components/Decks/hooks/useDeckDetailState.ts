"use client";

import { useState } from "react";

import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";

export function useDeckDetailState(_deckId: string | null) {
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [isDeleteSetOpen, setIsDeleteSetOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<DeckGroupRecord | null>(null);
  const [pendingDeleteSet, setPendingDeleteSet] = useState<DeckSetRecord | null>(null);
  const [isRebuildConfirmOpen, setIsRebuildConfirmOpen] = useState(false);
  const [pendingRebuildSetId, setPendingRebuildSetId] = useState<string | null>(null);

  return {
    isDeleteDeckOpen,
    setIsDeleteDeckOpen,
    isDeleteSetOpen,
    setIsDeleteSetOpen,
    isDeleteGroupOpen,
    setIsDeleteGroupOpen,
    pendingDeleteGroup,
    setPendingDeleteGroup,
    pendingDeleteSet,
    setPendingDeleteSet,
    isRebuildConfirmOpen,
    setIsRebuildConfirmOpen,
    pendingRebuildSetId,
    setPendingRebuildSetId,
  };
}
