"use client";

import { useMemo } from "react";

import type { MessageKey } from "@/i18n/messages";
import type { CardRecord } from "@/types/cards-db";

type UseRecentCardsArgs = {
  cards: CardRecord[];
};

export type RecentCardGroupId =
  | "lastHour"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "older";

export type RecentCardGroup = {
  id: RecentCardGroupId;
  labelKey: MessageKey;
  cards: CardRecord[];
};

const RECENT_GROUPS: Array<{ id: RecentCardGroupId; labelKey: MessageKey }> = [
  { id: "lastHour", labelKey: "recent.group.lastHour" },
  { id: "today", labelKey: "recent.group.today" },
  { id: "yesterday", labelKey: "recent.group.yesterday" },
  { id: "thisWeek", labelKey: "recent.group.thisWeek" },
  { id: "thisMonth", labelKey: "recent.group.thisMonth" },
  { id: "older", labelKey: "recent.group.older" },
];

export function useRecentCards({ cards }: UseRecentCardsArgs) {
  return useMemo(() => {
    const now = Date.now();
    const nowDate = new Date(now);
    const startOfToday = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const dayOfWeek = nowDate.getDay();
    const startOfWeek = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate() - dayOfWeek,
      0,
      0,
      0,
      0,
    ).getTime();
    const startOfMonth = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    ).getTime();

    const sorted = [...cards].sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) return bViewed - aViewed;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });
    const groups = new Map<RecentCardGroupId, CardRecord[]>(
      RECENT_GROUPS.map((group) => [group.id, []]),
    );

    sorted.forEach((card) => {
      const viewedAt = card.lastViewedAt ?? 0;
      let bucket: RecentCardGroupId = "older";
      if (viewedAt >= now - 60 * 60 * 1000) {
        bucket = "lastHour";
      } else if (viewedAt >= startOfToday) {
        bucket = "today";
      } else if (viewedAt >= startOfYesterday) {
        bucket = "yesterday";
      } else if (viewedAt >= startOfWeek) {
        bucket = "thisWeek";
      } else if (viewedAt >= startOfMonth) {
        bucket = "thisMonth";
      }
      groups.get(bucket)?.push(card);
    });

    return RECENT_GROUPS.map((group) => ({
      ...group,
      cards: groups.get(group.id) ?? [],
    }));
  }, [cards]);
}
