"use client";

import { useMemo } from "react";

import { useListDeckSets } from "@/api/hooks";

export function useDeckHasSets(deckId: string | null | undefined) {
  const query = useListDeckSets(
    { params: { deckId: deckId ?? "" } },
    { enabled: Boolean(deckId), staleTime: 0, refetchOnMount: "always" },
  );

  const hasSets = useMemo(() => {
    if (!deckId) return false;
    return (query.data?.length ?? 0) > 0;
  }, [deckId, query.data]);

  return {
    hasSets,
    isLoading: query.isLoading,
  };
}
