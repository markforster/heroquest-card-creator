"use client";

import { useMemo } from "react";

import { useGetDeck } from "@/api/hooks";
import { useI18n } from "@/i18n/I18nProvider";

export function useDeckHeaderModel(deckId: string | null) {
  const { t } = useI18n();
  const deckQuery = useGetDeck(
    { params: { deckId: deckId ?? "" } },
    { enabled: Boolean(deckId) },
  );

  const deckTitle = useMemo(
    () => deckQuery.data?.title ?? t("decks.untitledDeck"),
    [deckQuery.data?.title, t],
  );

  return {
    deckTitle,
  };
}
