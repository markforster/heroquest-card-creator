"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";
import type { CardRecord, CardStatus } from "@/api/cards";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { getImageLayerBounds, normalizeLegacyImageScale } from "@/lib/image-scale";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { ReactNode } from "react";

type CardDrafts = Partial<{ [K in TemplateId]: CardDataByTemplate[K] }>;

function normalizeDraftImageScale<T extends TemplateId>(
  templateId: T,
  draft: CardDataByTemplate[T],
): CardDataByTemplate[T] {
  const data = draft as {
    imageScale?: number;
    imageScaleMode?: "absolute" | "relative";
    imageOriginalWidth?: number;
    imageOriginalHeight?: number;
  };
  const bounds = getImageLayerBounds(templateId, "imageAssetId");
  const normalized = normalizeLegacyImageScale({
    imageScale: data.imageScale,
    imageScaleMode: data.imageScaleMode,
    bounds,
    imageWidth: data.imageOriginalWidth,
    imageHeight: data.imageOriginalHeight,
  });
  return {
    ...draft,
    imageScale: normalized.imageScale,
    imageScaleMode: normalized.imageScaleMode,
  } as CardDataByTemplate[T];
}

export type CardEditorState = {
  selectedTemplateId: TemplateId | null;
  draftTemplateId: TemplateId | null;
  draft: CardDataByTemplate[TemplateId] | null;
  draftPairingFrontIds: string[] | null;
  draftPairingBackIds: string[] | null;
  activeCardIdByTemplate: Partial<Record<TemplateId, string>>;
  activeCardStatusByTemplate: Partial<Record<TemplateId, CardStatus>>;
  isDirtyByTemplate: Partial<Record<TemplateId, boolean>>;
};

export type CardEditorContextValue = {
  state: CardEditorState;
  setSelectedTemplateId: (templateId: TemplateId | null) => void;
  setCardDraft: <K extends TemplateId>(templateId: K, data: CardDataByTemplate[K]) => void;
  setSingleDraft: <K extends TemplateId>(templateId: K, data: CardDataByTemplate[K] | null) => void;
  setDraftPairingFrontIds: (frontIds: string[] | null) => void;
  setDraftPairingBackIds: (backIds: string[] | null) => void;
  setActiveCard: (templateId: TemplateId, id: string | null, status: CardStatus | null) => void;
  setTemplateDirty: (templateId: TemplateId, isDirty: boolean) => void;
  loadCardIntoEditor: (templateId: TemplateId, record: CardRecord) => void;
};

const CardEditorContext = createContext<CardEditorContextValue | undefined>(undefined);

export function CardEditorProvider({ children }: { children: ReactNode }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
  const [draftTemplateId, setDraftTemplateId] = useState<TemplateId | null>(null);
  const [draft, setDraft] = useState<CardDataByTemplate[TemplateId] | null>(null);
  const [draftPairingFrontIds, setDraftPairingFrontIds] = useState<string[] | null>(null);
  const [draftPairingBackIds, setDraftPairingBackIds] = useState<string[] | null>(null);
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
    let initialDraft: CardDataByTemplate[TemplateId] | null = null;
    let initialDraftTemplateId: TemplateId | null = null;
    let initialDraftPairingFrontIds: string[] | null = null;
    let initialDraftPairingBackIds: string[] | null = null;
    const initialActiveIds: Partial<Record<TemplateId, string>> = {};
    const initialActiveStatuses: Partial<Record<TemplateId, CardStatus>> = {};

    try {
      const storedSelected = window.localStorage.getItem("hqcc.selectedTemplateId");
      if (storedSelected && cardTemplatesById[storedSelected as TemplateId]) {
        initialId = storedSelected as TemplateId;
      }

      const storedSingleDraft = window.localStorage.getItem("hqcc.draft.v1");
      const storedSingleDraftTemplateId = window.localStorage.getItem("hqcc.draftTemplateId.v1");
      const storedDraftPairings = window.localStorage.getItem("hqcc.draftPairingFrontIds.v1");
      const storedDraftPairingBacks = window.localStorage.getItem("hqcc.draftPairingBackIds.v1");
      if (storedSingleDraft && storedSingleDraftTemplateId) {
        const parsed = JSON.parse(storedSingleDraft) as unknown;
        if (parsed && typeof parsed === "object") {
          const templateId = storedSingleDraftTemplateId as TemplateId;
          if (cardTemplatesById[templateId]) {
            initialDraft = normalizeDraftImageScale(
              templateId,
              parsed as CardDataByTemplate[TemplateId],
            );
            initialDraftTemplateId = templateId;
          }
        }
      }
      if (storedDraftPairings) {
        const parsed = JSON.parse(storedDraftPairings) as unknown;
        if (Array.isArray(parsed)) {
          initialDraftPairingFrontIds = parsed.filter(
            (value) => typeof value === "string" && value.length > 0,
          );
        }
      }
      if (storedDraftPairingBacks) {
        const parsed = JSON.parse(storedDraftPairingBacks) as unknown;
        if (Array.isArray(parsed)) {
          initialDraftPairingBackIds = parsed.filter(
            (value) => typeof value === "string" && value.length > 0,
          );
        }
      }

      if (!initialDraft) {
        const storedDrafts = window.localStorage.getItem("hqcc.cardDrafts.v1");
        if (storedDrafts) {
          const parsed = JSON.parse(storedDrafts) as unknown;
          if (parsed && typeof parsed === "object") {
            const parsedDrafts = parsed as CardDrafts;
            const safeDrafts: CardDrafts = {};
            (Object.keys(parsed) as TemplateId[]).forEach((key) => {
              if (cardTemplatesById[key]) {
                const draftForTemplate = parsedDrafts[key];
                if (!draftForTemplate) return;
                safeDrafts[key] = normalizeDraftImageScale(
                  key,
                  draftForTemplate as CardDataByTemplate[TemplateId],
                );
              }
            });
            if (storedSelected && cardTemplatesById[storedSelected as TemplateId]) {
              const selectedKey = storedSelected as TemplateId;
              if (safeDrafts[selectedKey]) {
                initialDraft = safeDrafts[selectedKey] as CardDataByTemplate[TemplateId];
                initialDraftTemplateId = selectedKey;
              }
            }
            if (!initialDraft) {
              const firstEntry = Object.entries(safeDrafts)[0] as
                | [TemplateId, CardDataByTemplate[TemplateId]]
                | undefined;
              if (firstEntry) {
                initialDraft = firstEntry[1];
                initialDraftTemplateId = firstEntry[0];
              }
            }
            if (initialDraft && initialDraftTemplateId) {
              window.localStorage.setItem("hqcc.draft.v1", JSON.stringify(initialDraft));
              window.localStorage.setItem("hqcc.draftTemplateId.v1", initialDraftTemplateId);
              window.localStorage.removeItem("hqcc.cardDrafts.v1");
            }
          }
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
    if (initialDraft && initialDraftTemplateId) {
      setDraft(initialDraft);
      setDraftTemplateId(initialDraftTemplateId);
      setSelectedTemplateId(initialDraftTemplateId);
    }
    if (initialDraftPairingFrontIds?.length) {
      setDraftPairingFrontIds(initialDraftPairingFrontIds);
    }
    if (initialDraftPairingBackIds?.length) {
      setDraftPairingBackIds(initialDraftPairingBackIds);
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

  // Persist single draft whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (draft && draftTemplateId) {
        window.localStorage.setItem("hqcc.draft.v1", JSON.stringify(draft));
        window.localStorage.setItem("hqcc.draftTemplateId.v1", draftTemplateId);
      } else {
        window.localStorage.removeItem("hqcc.draft.v1");
        window.localStorage.removeItem("hqcc.draftTemplateId.v1");
      }
    } catch {
      // Ignore localStorage errors for draft
    }
  }, [draft, draftTemplateId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (draft && draftTemplateId && draftPairingFrontIds?.length) {
        window.localStorage.setItem(
          "hqcc.draftPairingFrontIds.v1",
          JSON.stringify(draftPairingFrontIds),
        );
      } else {
        window.localStorage.removeItem("hqcc.draftPairingFrontIds.v1");
      }
    } catch {
      // Ignore localStorage errors for draft pairings
    }
  }, [draft, draftTemplateId, draftPairingFrontIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (draft && draftTemplateId && draftPairingBackIds?.length) {
        window.localStorage.setItem(
          "hqcc.draftPairingBackIds.v1",
          JSON.stringify(draftPairingBackIds),
        );
      } else {
        window.localStorage.removeItem("hqcc.draftPairingBackIds.v1");
      }
    } catch {
      // Ignore localStorage errors for draft pairing backs
    }
  }, [draft, draftTemplateId, draftPairingBackIds]);

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
      // Ignore view updates; draft visibility should not fail the editor.
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
        draftTemplateId,
        draft,
        draftPairingFrontIds,
        draftPairingBackIds,
        activeCardIdByTemplate,
        activeCardStatusByTemplate,
        isDirtyByTemplate,
      },
      setSelectedTemplateId,
      setCardDraft: (templateId, data) => {
        setDraftTemplateId(templateId);
        setDraft(data as CardDataByTemplate[TemplateId]);
      },
      setSingleDraft: (templateId, data) => {
        setDraftTemplateId(data ? templateId : null);
        setDraft(data ? (data as CardDataByTemplate[TemplateId]) : null);
        if (!data) {
          setDraftPairingFrontIds(null);
          setDraftPairingBackIds(null);
        }
      },
      setDraftPairingFrontIds: (frontIds) => {
        setDraftPairingFrontIds(frontIds && frontIds.length ? frontIds : null);
      },
      setDraftPairingBackIds: (backIds) => {
        setDraftPairingBackIds(backIds && backIds.length ? backIds : null);
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
        setDraftTemplateId(templateId);
        setDraft(data as CardDataByTemplate[TemplateId]);
        setDraftPairingFrontIds(null);
        setDraftPairingBackIds(null);
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
      draftTemplateId,
      draft,
      draftPairingFrontIds,
      draftPairingBackIds,
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
