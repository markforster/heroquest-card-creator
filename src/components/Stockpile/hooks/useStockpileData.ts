import { useEffect, useRef, useState } from "react";

import { listCards } from "@/lib/cards-db";
import { listCollections } from "@/lib/collections-db";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

type ActiveFilter =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
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

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    listCards({ status: "saved" })
      .then((results) => {
        if (!cancelled) {
          setCards(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCards([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshToken]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    listCollections()
      .then((results) => {
        if (!cancelled) {
          setCollections(results);
          hasLoadedCollections.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([]);
          hasLoadedCollections.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshToken]);

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
  }, [activeFilter]);

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

  return {
    cards,
    setCards,
    collections,
    setCollections,
    storedCollectionId,
    setStoredCollectionId,
  };
};
