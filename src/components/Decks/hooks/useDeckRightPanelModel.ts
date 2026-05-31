"use client";

import { useEffect, useMemo, useState } from "react";

import { useListCards, useListCollections } from "@/api/hooks";
import type { DeckFaceFilter, RightPanelFaceMode } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";

const RIGHT_PANEL_VISIBLE_STORAGE_KEY = "hqcc.decks.rightPanelVisible";

function loadRightPanelVisiblePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(RIGHT_PANEL_VISIBLE_STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return true;
  } catch {
    return true;
  }
}

export function useDeckRightPanelModel() {
  const { t } = useI18n();
  const [isRightPanelVisible, setIsRightPanelVisible] = useState<boolean>(() =>
    loadRightPanelVisiblePreference(),
  );
  const [backFilter, setBackFilter] = useState<DeckFaceFilter>({ type: "all" });
  const [rightPanelFaceMode, setRightPanelFaceMode] = useState<RightPanelFaceMode>("back");
  const [sourceSearch, setSourceSearch] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        RIGHT_PANEL_VISIBLE_STORAGE_KEY,
        isRightPanelVisible ? "1" : "0",
      );
    } catch {
      // Ignore persistence errors for UI preference state.
    }
  }, [isRightPanelVisible]);

  const collectionsQuery = useListCollections(undefined, {
    enabled: isRightPanelVisible,
    staleTime: 60_000,
  });
  const cardsQuery = useListCards(
    undefined,
    {
      enabled: isRightPanelVisible,
      staleTime: 0,
      refetchOnMount: "always",
    },
  );

  const rightPanelEmptyLabel = useMemo(
    () =>
      rightPanelFaceMode === "front" ? t("empty.noCardsFound") : t("empty.noBackCards"),
    [rightPanelFaceMode, t],
  );

  return {
    isRightPanelVisible,
    setIsRightPanelVisible,
    toggleRightPanel: () => setIsRightPanelVisible((prev) => !prev),
    backFilter,
    setBackFilter,
    rightPanelFaceMode,
    setRightPanelFaceMode,
    sourceSearch,
    setSourceSearch,
    backCollections: collectionsQuery.data ?? [],
    backCards: cardsQuery.data ?? [],
    rightPanelEmptyLabel,
  };
}
