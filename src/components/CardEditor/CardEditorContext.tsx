"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { listCards } from "@/lib/cards-db";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardStatus, CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

import type { ReactNode } from "react";

type CardDrafts = Partial<{ [K in TemplateId]: CardDataByTemplate[K] }>;

export type CardEditorState = {
  selectedTemplateId: TemplateId | null;
  cardDrafts: CardDrafts;
  activeCardIdByTemplate: Partial<Record<TemplateId, string>>;
  activeCardStatusByTemplate: Partial<Record<TemplateId, CardStatus>>;
  isDirtyByTemplate: Partial<Record<TemplateId, boolean>>;
};

export type CardEditorContextValue = {
  state: CardEditorState;
  setSelectedTemplateId: (templateId: TemplateId | null) => void;
  setCardDraft: <K extends TemplateId>(templateId: K, data: CardDataByTemplate[K]) => void;
  setActiveCard: (templateId: TemplateId, id: string | null, status: CardStatus | null) => void;
  setTemplateDirty: (templateId: TemplateId, isDirty: boolean) => void;
  loadCardIntoEditor: (templateId: TemplateId, record: CardRecord) => void;
};

const CardEditorContext = createContext<CardEditorContextValue | undefined>(undefined);

export function CardEditorProvider({ children }: { children: ReactNode }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
  const [cardDrafts, setCardDrafts] = useState<CardDrafts>({});
  const [activeCardIdByTemplate, setActiveCardIdByTemplate] = useState<
    Partial<Record<TemplateId, string>>
  >({});
  const [activeCardStatusByTemplate, setActiveCardStatusByTemplate] = useState<
    Partial<Record<TemplateId, CardStatus>>
  >({});
  const [isDirtyByTemplate, setIsDirtyByTemplate] = useState<Partial<Record<TemplateId, boolean>>>(
    {},
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate initial selection, drafts, and any persisted active cards from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialId: TemplateId | null = cardTemplates[0]?.id ?? null;
    let initialDrafts: CardDrafts = {};
    const initialActiveIds: Partial<Record<TemplateId, string>> = {};
    const initialActiveStatuses: Partial<Record<TemplateId, CardStatus>> = {};

    try {
      const storedSelected = window.localStorage.getItem("hqcc.selectedTemplateId");
      if (storedSelected && cardTemplatesById[storedSelected as TemplateId]) {
        initialId = storedSelected as TemplateId;
      }

      const storedDrafts = window.localStorage.getItem("hqcc.cardDrafts.v1");
      if (storedDrafts) {
        const parsed = JSON.parse(storedDrafts) as unknown;
        if (parsed && typeof parsed === "object") {
          const safeDrafts: CardDrafts = {};
          (Object.keys(parsed) as TemplateId[]).forEach((key) => {
            if (cardTemplatesById[key]) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              safeDrafts[key] = (parsed as any)[key] as CardDataByTemplate[TemplateId];
            }
          });
          initialDrafts = safeDrafts;
        }
      }

      const storedActive = window.localStorage.getItem("hqcc.activeCards.v1");
      if (storedActive) {
        const parsed = JSON.parse(storedActive) as unknown;
        if (parsed && typeof parsed === "object") {
          const byTemplate = parsed as {
            [key: string]: { id?: string | null; status?: CardStatus | null } | undefined;
          };
          (Object.keys(byTemplate) as string[]).forEach((key) => {
            const templateId = key as TemplateId;
            if (!cardTemplatesById[templateId]) return;
            const entry = byTemplate[templateId];
            if (!entry) return;
            if (entry.id) {
              initialActiveIds[templateId] = entry.id;
            }
            if (entry.status) {
              initialActiveStatuses[templateId] = entry.status;
            }
          });
        }
      }
    } catch {
      // Ignore localStorage errors and fall back to defaults
    }

    if (initialId) {
      setSelectedTemplateId(initialId);
    }
    if (Object.keys(initialDrafts).length > 0) {
      setCardDrafts(initialDrafts);
    }
    if (Object.keys(initialActiveIds).length > 0) {
      setActiveCardIdByTemplate(initialActiveIds);
    }
    if (Object.keys(initialActiveStatuses).length > 0) {
      setActiveCardStatusByTemplate(initialActiveStatuses);
    }
    setIsHydrated(true);
  }, []);

  // Best-effort: if we have a selected template with drafts but no active card mapping
  // (e.g. older localStorage created before active cards were persisted), try to infer
  // the active card from the cards DB by picking the most recently updated saved card
  // for that template. This avoids forcing the user to "Save as new" and creating
  // duplicate cards after a hard refresh.
  useEffect(() => {
    if (!isHydrated) return;
    if (!selectedTemplateId) return;
    if (activeCardIdByTemplate[selectedTemplateId]) return;
    if (!cardDrafts[selectedTemplateId]) return;

    let cancelled = false;

    (async () => {
      try {
        const cards = await listCards({ templateId: selectedTemplateId, status: "saved" });
        if (cancelled) return;
        if (!cards.length) return;

        const latest = cards.reduce((acc, card) => (card.updatedAt > acc.updatedAt ? card : acc));

        setActiveCardIdByTemplate((prev) => {
          if (prev[selectedTemplateId]) {
            return prev;
          }
          return {
            ...prev,
            [selectedTemplateId]: latest.id,
          };
        });
        setActiveCardStatusByTemplate((prev) => {
          if (prev[selectedTemplateId]) {
            return prev;
          }
          return {
            ...prev,
            [selectedTemplateId]: latest.status,
          };
        });
      } catch {
        // Ignore DB errors; in the worst case the user will still need to "Save as new".
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCardIdByTemplate, cardDrafts, isHydrated, selectedTemplateId]);

  // Persist current selection whenever it changes
  useEffect(() => {
    if (!selectedTemplateId) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("hqcc.selectedTemplateId", selectedTemplateId);
    } catch {
      // Ignore localStorage errors
    }
  }, [selectedTemplateId]);

  // Persist drafts whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("hqcc.cardDrafts.v1", JSON.stringify(cardDrafts));
    } catch {
      // Ignore localStorage errors for drafts
    }
  }, [cardDrafts]);

  // Persist active cards (id + status) whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload: {
        [key: string]: { id?: string; status?: CardStatus | null } | undefined;
      } = {};
      (Object.keys(activeCardIdByTemplate) as TemplateId[]).forEach((templateId) => {
        const id = activeCardIdByTemplate[templateId];
        const status = activeCardStatusByTemplate[templateId];
        if (!id && !status) return;
        payload[templateId] = { id, status: status ?? null };
      });
      window.localStorage.setItem("hqcc.activeCards.v1", JSON.stringify(payload));
    } catch {
      // Ignore localStorage errors
    }
  }, [activeCardIdByTemplate, activeCardStatusByTemplate]);

  const value = useMemo<CardEditorContextValue>(
    () => ({
      state: {
        selectedTemplateId,
        cardDrafts,
        activeCardIdByTemplate,
        activeCardStatusByTemplate,
        isDirtyByTemplate,
      },
      setSelectedTemplateId,
      setCardDraft: (templateId, data) => {
        setCardDrafts((prev) => ({
          ...prev,
          [templateId]: data,
        }));
      },
      setActiveCard: (templateId, id, status) => {
        setActiveCardIdByTemplate((prev) => ({
          ...prev,
          [templateId]: id ?? undefined,
        }));
        setActiveCardStatusByTemplate((prev) => ({
          ...prev,
          [templateId]: status ?? undefined,
        }));
      },
      setTemplateDirty: (templateId, isDirty) => {
        setIsDirtyByTemplate((prev) => ({
          ...prev,
          [templateId]: isDirty || undefined,
        }));
      },
      loadCardIntoEditor: (templateId, record) => {
        const data = cardRecordToCardData({
          ...record,
          templateId,
        } as CardRecord & { templateId: TemplateId });
        setCardDrafts((prev) => ({
          ...prev,
          [templateId]: data,
        }));
        setActiveCardIdByTemplate((prev) => ({
          ...prev,
          [templateId]: record.id,
        }));
        setActiveCardStatusByTemplate((prev) => ({
          ...prev,
          [templateId]: record.status,
        }));
        setIsDirtyByTemplate((prev) => ({
          ...prev,
          [templateId]: false,
        }));
      },
    }),
    [
      selectedTemplateId,
      cardDrafts,
      activeCardIdByTemplate,
      activeCardStatusByTemplate,
      isDirtyByTemplate,
    ],
  );

  if (!isHydrated) {
    return null;
  }

  return <CardEditorContext.Provider value={value}>{children}</CardEditorContext.Provider>;
}

export function useCardEditor(): CardEditorContextValue {
  const ctx = useContext(CardEditorContext);
  if (!ctx) {
    throw new Error("useCardEditor must be used within a CardEditorProvider");
  }
  return ctx;
}
