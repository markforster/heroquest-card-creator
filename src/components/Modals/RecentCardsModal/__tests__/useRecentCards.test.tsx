import { renderHook } from "@testing-library/react";

import type { CardRecord } from "@/api/cards";
import { useRecentCards } from "@/components/Modals/RecentCardsModal/useRecentCards";

function createCard(id: string, name: string, lastViewedAt: number, updatedAt = lastViewedAt) {
  return {
    id,
    templateId: "hero",
    status: "saved",
    name,
    nameLower: name.toLocaleLowerCase(),
    createdAt: 1,
    updatedAt,
    lastViewedAt,
    schemaVersion: 2,
  } satisfies CardRecord;
}

describe("useRecentCards", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("groups cards by viewing recency and returns every bucket in display order", () => {
    const now = new Date(2026, 6, 31, 12, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(now);
    const cards = [
      createCard("older", "Older", new Date(2026, 5, 30, 12).getTime()),
      createCard("month", "Month", new Date(2026, 6, 10, 12).getTime()),
      createCard("week", "Week", new Date(2026, 6, 28, 12).getTime()),
      createCard("yesterday", "Yesterday", new Date(2026, 6, 30, 12).getTime()),
      createCard("today", "Today", new Date(2026, 6, 31, 9).getTime()),
      createCard("hour", "Hour", new Date(2026, 6, 31, 11, 30).getTime()),
    ];

    const { result } = renderHook(() => useRecentCards({ cards }));

    expect(result.current.map((group) => group.id)).toEqual([
      "lastHour",
      "today",
      "yesterday",
      "thisWeek",
      "thisMonth",
      "older",
    ]);
    expect(result.current.map((group) => group.cards.map((card) => card.id))).toEqual([
      ["hour"],
      ["today"],
      ["yesterday"],
      ["week"],
      ["month"],
      ["older"],
    ]);
  });

  it("sorts equal viewing times by update time and then normalized name", () => {
    const now = new Date(2026, 6, 31, 12, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(now);
    const viewedAt = now - 10 * 60 * 1000;
    const cards = [
      createCard("beta", "Beta", viewedAt, 1),
      createCard("alpha", "Alpha", viewedAt, 1),
      createCard("updated", "Updated", viewedAt, 2),
    ];

    const { result } = renderHook(() => useRecentCards({ cards }));

    expect(result.current[0].cards.map((card) => card.id)).toEqual(["updated", "alpha", "beta"]);
  });
});
