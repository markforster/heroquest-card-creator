import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import { useListCards, useListCollections } from "@/api/hooks";
import type { CardRecord } from "@/api/cards";
import type { CollectionRecord } from "@/api/collections";

type ActiveFilter =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
  | { type: "recentlyDeleted" }
  | { type: "collection"; id: string };

type UseStockpileDataOptions = {
  isOpen: boolean;
  refreshToken?: number;
  activeFilter: ActiveFilter;
  setActiveFilter: (filter: ActiveFilter) => void;
};

export const useStockpileData = ({
  isOpen,
  refreshToken,
  activeFilter,
  setActiveFilter,
}: UseStockpileDataOptions) => {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [storedCollectionId, setStoredCollectionId] = useState<string | null>(null);
  const hasHydratedStoredCollection = useRef(false);
  const hasResolvedStoredCollection = useRef(false);
  const hasLoadedCollections = useRef(false);
  const listCardsQuery = useListCards(
    { queries: { status: "saved", deleted: "include" } },
    {
      enabled: isOpen,
      staleTime: 0,
      keepPreviousData: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  );
  const listCollectionsQuery = useListCollections(undefined, {
    enabled: isOpen,
    staleTime: 60_000,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    setCards(listCardsQuery.data ?? []);
  }, [isOpen, listCardsQuery.data, refreshToken]);

  useEffect(() => {
    if (!isOpen) return;
    setCollections(listCollectionsQuery.data ?? []);
    if (!listCollectionsQuery.isLoading) {
      hasLoadedCollections.current = true;
    }
  }, [isOpen, listCollectionsQuery.data, listCollectionsQuery.isLoading, refreshToken]);

  useEffect(() => {
    if (!storedCollectionId) {
      return;
    }
    if (!hasLoadedCollections.current) {
      return;
    }

    const exists = collections.some((collection) => collection.id === storedCollectionId);
    if (exists) {
      setActiveFilter({ type: "collection", id: storedCollectionId });
      hasResolvedStoredCollection.current = true;
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("hqcc.selectedCollectionId");
    }
    setStoredCollectionId(null);
    hasResolvedStoredCollection.current = true;
  }, [collections, storedCollectionId, setActiveFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    if (!hasHydratedStoredCollection.current) {
      return;
    }
    if (!hasResolvedStoredCollection.current) {
      return;
    }

    if (activeFilter.type === "collection") {
      window.localStorage.setItem("hqcc.selectedCollectionId", activeFilter.id);
      setStoredCollectionId(activeFilter.id);
      return;
    }

    window.localStorage.removeItem("hqcc.selectedCollectionId");
    setStoredCollectionId(null);
  }, [activeFilter, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined") {
      const storedId = window.localStorage.getItem("hqcc.selectedCollectionId");
      setStoredCollectionId(storedId);
      hasHydratedStoredCollection.current = true;
      if (!storedId) {
        hasResolvedStoredCollection.current = true;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    let timeoutId: number | null = null;
    const handleUpdate = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        listCardsQuery.refetch().catch(() => {
          // Ignore refresh errors.
        });
      }, 250);
    };
    window.addEventListener("hqcc-cards-updated", handleUpdate);
    return () => {
      window.removeEventListener("hqcc-cards-updated", handleUpdate);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isOpen, listCardsQuery]);

  return {
    cards,
    setCards,
    collections,
    setCollections,
    storedCollectionId,
    setStoredCollectionId,
  };
};
