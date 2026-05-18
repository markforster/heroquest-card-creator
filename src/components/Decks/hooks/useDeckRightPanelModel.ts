"use client";

import { useMemo, useState } from "react";

import { useListCards, useListCollections } from "@/api/hooks";
import type { DeckFaceFilter, RightPanelFaceMode } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";

export function useDeckRightPanelModel() {
  const { t } = useI18n();
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  const [backFilter, setBackFilter] = useState<DeckFaceFilter>({ type: "all" });
  const [rightPanelFaceMode, setRightPanelFaceMode] = useState<RightPanelFaceMode>("back");
  const [sourceSearch, setSourceSearch] = useState("");

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
      rightPanelFaceMode === "back" ? t("empty.noBackCards") : t("empty.noCardsFound"),
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
