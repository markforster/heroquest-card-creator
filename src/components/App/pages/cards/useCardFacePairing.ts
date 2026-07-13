"use client";

import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import type { CardFace } from "@/types/card-face";

import { resolvePairedOppositeFace } from "./pairedFaceResolver";

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
        const { resolvedCardId, sortedCandidateIds } = resolvePairedOppositeFace({
          activeFaceId: activeCardId,
          effectiveFace: "back",
          pairs,
          cards,
        });
        setPairedFrontCount(sortedCandidateIds.length);
        setPairedFrontIds(sortedCandidateIds);
        setActiveFrontId(resolvedCardId);
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
      const cards = await apiClient.listCards({ queries: { status: "saved" } });
      if (!active) return;
      const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
      if (!active) return;
      const { resolvedCardId } = resolvePairedOppositeFace({
        activeFaceId: activeCardId,
        effectiveFace: "front",
        preferredOppositeFaceId: lastRememberedBackId,
        pairs,
        cards,
      });
      setPairedBackId(resolvedCardId);
    };
    void loadPairedBack().catch(() => {
      if (!active) return;
      setPairedBackId(null);
    });
    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace, lastRememberedBackId]);

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
