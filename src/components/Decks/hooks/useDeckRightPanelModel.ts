"use client";

import { useMemo, useState } from "react";

import { useListCards, useListCollections } from "@/api/hooks";
import type { BackFilter, RightPanelFaceMode } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";

export function useDeckRightPanelModel() {
  const { t } = useI18n();
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [backFilter, setBackFilter] = useState<BackFilter>({ type: "all" });
  const [rightPanelFaceMode, setRightPanelFaceMode] = useState<RightPanelFaceMode>("back");

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
    backCollections: collectionsQuery.data ?? [],
    backCards: cardsQuery.data ?? [],
    rightPanelEmptyLabel,
  };
}
