import type { PairRecord } from "@/api/pairs/types";
import { resolvePairedOppositeFace } from "@/components/App/pages/cards/pairedFaceResolver";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

function createCardRecord(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    templateId: "hero" as TemplateId,
    status: "saved",
    name: "Card 1",
    nameLower: "card 1",
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 2,
    face: "front",
    ...overrides,
  };
}

function createPairRecord(overrides: Partial<PairRecord> = {}): PairRecord {
  return {
    id: "pair-1",
    frontFaceId: "front-1",
    backFaceId: "back-1",
    ...overrides,
  };
}

describe("resolvePairedOppositeFace", () => {
  it("prefers a remembered valid opposite face over more recent candidates", () => {
    const cards = [
      createCardRecord({ id: "back-1", name: "Back 1", nameLower: "back 1", lastViewedAt: 10 }),
      createCardRecord({ id: "back-2", name: "Back 2", nameLower: "back 2", lastViewedAt: 100 }),
    ];
    const pairs = [
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-2" }),
    ];

    expect(
      resolvePairedOppositeFace({
        activeFaceId: "front-1",
        effectiveFace: "front",
        preferredOppositeFaceId: "back-1",
        pairs,
        cards,
      }),
    ).toEqual({
      resolvedCardId: "back-1",
      sortedCandidateIds: ["back-2", "back-1"],
    });
  });

  it("ignores an invalid remembered opposite face and falls back to most recently viewed", () => {
    const cards = [
      createCardRecord({ id: "back-1", name: "Back 1", nameLower: "back 1", lastViewedAt: 50 }),
      createCardRecord({ id: "back-2", name: "Back 2", nameLower: "back 2", lastViewedAt: 100 }),
    ];
    const pairs = [
      createPairRecord({ frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-2" }),
    ];

    expect(
      resolvePairedOppositeFace({
        activeFaceId: "front-1",
        effectiveFace: "front",
        preferredOppositeFaceId: "back-9",
        pairs,
        cards,
      }).resolvedCardId,
    ).toBe("back-2");
  });

  it("uses updatedAt as the secondary tie-breaker when lastViewedAt is tied", () => {
    const cards = [
      createCardRecord({ id: "back-1", updatedAt: 5, lastViewedAt: 10, name: "Back 1", nameLower: "back 1" }),
      createCardRecord({ id: "back-2", updatedAt: 20, lastViewedAt: 10, name: "Back 2", nameLower: "back 2" }),
    ];
    const pairs = [
      createPairRecord({ frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-2" }),
    ];

    expect(
      resolvePairedOppositeFace({
        activeFaceId: "front-1",
        effectiveFace: "front",
        pairs,
        cards,
      }).resolvedCardId,
    ).toBe("back-2");
  });

  it("uses normalized name as the final tie-breaker", () => {
    const cards = [
      createCardRecord({ id: "back-b", updatedAt: 10, lastViewedAt: 10, name: "Zulu", nameLower: "zulu" }),
      createCardRecord({ id: "back-a", updatedAt: 10, lastViewedAt: 10, name: "Alpha", nameLower: "alpha" }),
    ];
    const pairs = [
      createPairRecord({ frontFaceId: "front-1", backFaceId: "back-b" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-a" }),
    ];

    expect(
      resolvePairedOppositeFace({
        activeFaceId: "front-1",
        effectiveFace: "front",
        pairs,
        cards,
      }).resolvedCardId,
    ).toBe("back-a");
  });

  it("returns null when there is no valid opposite face", () => {
    expect(
      resolvePairedOppositeFace({
        activeFaceId: "front-1",
        effectiveFace: "front",
        pairs: [createPairRecord({ frontFaceId: "front-1", backFaceId: "back-1" })],
        cards: [],
      }),
    ).toEqual({
      resolvedCardId: null,
      sortedCandidateIds: [],
    });
  });

  it("resolves front candidates for back-face editing using the same ordering", () => {
    const cards = [
      createCardRecord({
        id: "front-1",
        face: "front",
        name: "Front 1",
        nameLower: "front 1",
        lastViewedAt: 40,
      }),
      createCardRecord({
        id: "front-2",
        face: "front",
        name: "Front 2",
        nameLower: "front 2",
        lastViewedAt: 80,
      }),
    ];
    const pairs = [
      createPairRecord({ frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "back-1" }),
    ];

    expect(
      resolvePairedOppositeFace({
        activeFaceId: "back-1",
        effectiveFace: "back",
        pairs,
        cards,
      }).resolvedCardId,
    ).toBe("front-2");
  });
});
