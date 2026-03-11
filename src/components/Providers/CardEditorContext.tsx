"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";
import type { CardStatus } from "@/api/cards";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import type { TemplateId } from "@/types/templates";

import type { ReactNode } from "react";

export type CardEditorState = {
  selectedTemplateId: TemplateId | null;
  activeCardIdByTemplate: Partial<Record<TemplateId, string>>;
  activeCardStatusByTemplate: Partial<Record<TemplateId, CardStatus>>;
};

export type CardEditorContextValue = {
  state: CardEditorState;
  setSelectedTemplateId: (templateId: TemplateId | null) => void;
  setActiveCard: (templateId: TemplateId, id: string | null, status: CardStatus | null) => void;
};

const CardEditorContext = createContext<CardEditorContextValue | undefined>(undefined);

export function CardEditorProvider({ children }: { children: ReactNode }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
  const [activeCardIdByTemplate, setActiveCardIdByTemplate] = useState<
    Partial<Record<TemplateId, string>>
  >({});
  const [activeCardStatusByTemplate, setActiveCardStatusByTemplate] = useState<
    Partial<Record<TemplateId, CardStatus>>
  >({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate initial selection and any persisted active cards from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage
        .persisted()
        .then((isPersisted) => {
          if (!isPersisted) {
            return navigator.storage.persist();
          }
          return undefined;
        })
        .catch(() => {
          // Ignore storage persistence errors.
        });
    }

    let initialId: TemplateId | null = cardTemplates[0]?.id ?? null;
    const initialActiveIds: Partial<Record<TemplateId, string>> = {};
    const initialActiveStatuses: Partial<Record<TemplateId, CardStatus>> = {};

    try {
      const storedSelected = window.localStorage.getItem("hqcc.selectedTemplateId");
      if (storedSelected && cardTemplatesById[storedSelected as TemplateId]) {
        initialId = storedSelected as TemplateId;
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
    if (Object.keys(initialActiveIds).length > 0) {
      setActiveCardIdByTemplate(initialActiveIds);
    }
    if (Object.keys(initialActiveStatuses).length > 0) {
      setActiveCardStatusByTemplate(initialActiveStatuses);
    }
    setIsHydrated(true);
  }, []);

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

  useEffect(() => {
    if (!isHydrated) return;
    if (!selectedTemplateId) return;
    const activeId = activeCardIdByTemplate[selectedTemplateId];
    const activeStatus = activeCardStatusByTemplate[selectedTemplateId];
    if (!activeId || activeStatus !== "saved") return;

    apiClient
      .touchCardLastViewed({}, { params: { id: activeId } })
      .catch(() => {
        // Ignore view updates; editor should not fail.
      });
  }, [
    activeCardIdByTemplate,
    activeCardStatusByTemplate,
    isHydrated,
    selectedTemplateId,
  ]);

  const value = useMemo<CardEditorContextValue>(
    () => ({
      state: {
        selectedTemplateId,
        activeCardIdByTemplate,
        activeCardStatusByTemplate,
      },
      setSelectedTemplateId,
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
    }),
    [selectedTemplateId, activeCardIdByTemplate, activeCardStatusByTemplate],
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
