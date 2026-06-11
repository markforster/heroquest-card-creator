"use client";

import { useEffect, useRef, useState } from "react";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import type { CardFace } from "@/types/card-face";

type UseCardFacePairingArgs = {
  activeCardId?: string;
  effectiveFace: CardFace | null;
};

export function useCardFacePairing({ activeCardId, effectiveFace }: UseCardFacePairingArgs) {
  const [pairedFrontCount, setPairedFrontCount] = useState(0);
  const [pairedFrontIds, setPairedFrontIds] = useState<string[]>([]);
  const [activeFrontId, setActiveFrontId] = useState<string | null>(null);
  const [pairedBackId, setPairedBackId] = useState<string | null>(null);
  const [lastRememberedBackId, setLastRememberedBackId] = useState<string | null>(null);
  const [frontViewToken, setFrontViewToken] = useState(0);
  const lastFaceRef = useRef<CardFace | null>(null);

  useEffect(() => {
    if (effectiveFace !== "back" || !activeCardId) {
      setPairedFrontCount(0);
      setPairedFrontIds([]);
      setActiveFrontId(null);
      return;
    }
    setLastRememberedBackId(activeCardId);
    let active = true;
    void apiClient
      .listCards({ queries: { status: "saved" } })
      .then(async (cardsResponse) => {
        if (!active) return;
        const cards = Array.isArray(cardsResponse) ? cardsResponse : [];
        const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
        if (!active) return;
        const frontIds = new Set(
          pairs.map((pair) => pair.frontFaceId).filter((id): id is string => Boolean(id)),
        );
        const matches = sortByRecent(cards.filter((card) => frontIds.has(card.id)));
        setPairedFrontCount(matches.length);
        setPairedFrontIds(matches.map((card) => card.id));
        setActiveFrontId(matches[0]?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setPairedFrontCount(0);
        setPairedFrontIds([]);
        setActiveFrontId(null);
      });
    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace]);

  useEffect(() => {
    if (effectiveFace !== "front" || !activeCardId) {
      setPairedBackId(null);
      return;
    }
    let active = true;
    const loadPairedBack = async () => {
      const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
      if (!active) return;
      const match =
        pairs.find((pair) => pair.frontFaceId === activeCardId && pair.backFaceId) ??
        pairs.find((pair) => pair.backFaceId);
      setPairedBackId(match?.backFaceId ?? null);
    };
    void loadPairedBack().catch(() => {
      if (!active) return;
      setPairedBackId(null);
    });
    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace]);

  useEffect(() => {
    const previousFace = lastFaceRef.current;
    if (previousFace === "back" && effectiveFace === "front") {
      setFrontViewToken((prev) => prev + 1);
    }
    lastFaceRef.current = effectiveFace;
  }, [effectiveFace]);

  return {
    activeFrontId,
    frontViewToken,
    lastRememberedBackId,
    pairedBackId,
    pairedFrontCount,
    pairedFrontIds,
    setLastRememberedBackId,
  };
}

function sortByRecent(cards: CardRecord[]) {
  return cards.sort((a, b) => {
    const aViewed = a.lastViewedAt ?? 0;
    const bViewed = b.lastViewedAt ?? 0;
    if (bViewed !== aViewed) return bViewed - aViewed;
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    const aName = a.nameLower ?? a.name.toLocaleLowerCase();
    const bName = b.nameLower ?? b.name.toLocaleLowerCase();
    return aName.localeCompare(bName);
  });
}
