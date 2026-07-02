"use client";

import type { CardRecord, CardStatus } from "@/api/cards";
import { apiClient } from "@/api/client";
import { invalidateCollectionsQueries } from "@/api/queryInvalidation";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import type { CardEditorContextValue } from "@/components/Providers/CardEditorContext";
import { cardDataToCardRecordPatch, cardRecordToCardData } from "@/lib/card-record-mapper";
import { clearDraft, saveDraft } from "@/lib/draft-storage";
import { applyInspectorDefaults } from "@/lib/editor-form";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { NavigateFunction } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";

type SavingMode = "new" | "update" | null;
type AnalyticsTrackProperties = Record<string, string | number | boolean | null | undefined>;

type CreateCardPageActionsArgs = {
  activeCardId?: string;
  activeStatus?: CardStatus;
  bypassNextNavigation: () => void;
  currentTemplateId: TemplateId | null;
  draftSourceCardId: string | null;
  methods: Pick<UseFormReturn<CardDataByTemplate[TemplateId]>, "getValues">;
  navigate: NavigateFunction;
  previewRef: RefObject<CardPreviewHandle>;
  queryClient: QueryClient;
  resetWithSaved: (values: CardDataByTemplate[TemplateId]) => void;
  setActiveCard: CardEditorContextValue["setActiveCard"];
  setDraftSourceCardId: Dispatch<SetStateAction<string | null>>;
  setSaveToken: Dispatch<SetStateAction<number>>;
  setSavingMode: Dispatch<SetStateAction<SavingMode>>;
  setSelectedTemplateId: CardEditorContextValue["setSelectedTemplateId"];
  track: (event: string, properties?: AnalyticsTrackProperties) => void;
};

export function createCardPageActions({
  activeCardId,
  activeStatus,
  bypassNextNavigation,
  currentTemplateId,
  draftSourceCardId,
  methods,
  navigate,
  previewRef,
  queryClient,
  resetWithSaved,
  setActiveCard,
  setDraftSourceCardId,
  setSaveToken,
  setSavingMode,
  setSelectedTemplateId,
  track,
}: CreateCardPageActionsArgs) {
  const handleSave = async (mode: Exclude<SavingMode, null>) => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const currentDraftValue = methods.getValues() as CardDataByTemplate[TemplateId];
    const draftName =
      (currentDraftValue &&
        "name" in currentDraftValue &&
        (currentDraftValue as { name?: string | null }).name) ||
      "";
    if (!draftName || !draftName.toString().trim()) {
      return;
    }

    const startedAt = Date.now();
    setSavingMode(mode);

    const thumbnailBlob = await renderThumbnailBlob(
      previewRef,
      "[card-page] Failed to render thumbnail blob",
    );
    const derivedName = (draftName ?? "").toString().trim() || `${templateId} card`;
    const patch = cardDataToCardRecordPatch(templateId, derivedName, currentDraftValue as never);
    const viewedAt = Date.now();

    let didSave = false;
    let didCreateNew = false;
    let copiedCollectionMemberships = false;
    try {
      if (mode === "new") {
        const duplicateFromCardId = draftSourceCardId;
        const record = await apiClient.createCard({
          ...patch,
          templateId,
          status: "saved",
          thumbnailBlob,
          name: derivedName,
          lastViewedAt: viewedAt,
          ...(duplicateFromCardId ? { duplicateFromCardId } : {}),
        });
        setActiveCard(templateId, record.id, record.status);
        bypassNextNavigation();
        navigate(`/cards/${record.id}`, { replace: true });
        resetWithSaved(mapCardRecordToFormValues(templateId, record));
        didSave = true;
        didCreateNew = true;
        copiedCollectionMemberships = Boolean(duplicateFromCardId);
      } else if (mode === "update") {
        if (!activeCardId || activeStatus !== "saved") return;
        const record = await apiClient.updateCard(
          { ...patch, thumbnailBlob, lastViewedAt: viewedAt },
          { params: { id: activeCardId } },
        );
        if (record) {
          setActiveCard(templateId, record.id, record.status);
          resetWithSaved(mapCardRecordToFormValues(templateId, record));
          didSave = true;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[card-page] Failed to save card", error);
    } finally {
      if (didSave && copiedCollectionMemberships) {
        await invalidateCollectionsQueries(queryClient);
      }
      if (didSave) {
        setSaveToken((prev) => prev + 1);
      }
      if (didCreateNew) {
        clearDraft();
        setDraftSourceCardId(null);
      }
      await settleSavingState(startedAt);
      setSavingMode(null);
    }
  };

  const saveCurrentCard = async () => {
    if (!currentTemplateId) return false;
    const mode = activeCardId && activeStatus === "saved" ? "update" : "new";
    track("save_started", { mode });
    await handleSave(mode);
    return true;
  };

  const repairCurrentCardThumbnail = async () => {
    if (!activeCardId) return false;
    const thumbnailBlob = await renderThumbnailBlob(
      previewRef,
      "[card-page] Failed to render thumbnail blob for repair",
    );
    if (!thumbnailBlob) return false;
    try {
      return await apiClient.updateCardThumbnail(
        { thumbnailBlob },
        { params: { id: activeCardId } },
      );
    } catch {
      return false;
    }
  };

  const duplicateCurrentCard = async (withPairing: boolean) => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const currentValues = methods.getValues() as CardDataByTemplate[TemplateId];
    const usesTitleField = inspectorFieldsByTemplate[templateId]?.some(
      (field) => field.fieldType === "title",
    );
    const primaryName =
      (currentValues && "name" in currentValues
        ? (currentValues as { name?: string | null }).name
        : "") || "";
    const nextLabel = primaryName ? nextDuplicateTitle(String(primaryName)) : "";
    const nextDraft = {
      ...currentValues,
      ...(nextLabel ? { name: nextLabel } : {}),
      ...(usesTitleField && nextLabel ? { title: nextLabel } : {}),
    } as CardDataByTemplate[TemplateId];
    setSelectedTemplateId(templateId);
    saveDraft(templateId, nextDraft, { sourceCardId: activeCardId ?? null });
    setDraftSourceCardId(activeCardId ?? null);
    resetWithSaved(applyInspectorDefaults(templateId, nextDraft));
    setActiveCard(templateId, null, null);
    bypassNextNavigation();
    navigate("/cards/new", { replace: true });
    if (withPairing) {
      // Pairing for new duplicates is not persisted; ignore for now.
    }
  };

  return {
    duplicateCurrentCard,
    repairCurrentCardThumbnail,
    saveCurrentCard,
  };
}

async function renderThumbnailBlob(
  previewRef: RefObject<CardPreviewHandle>,
  errorMessage: string,
) {
  let thumbnailBlob: Blob | null = null;
  try {
    const blob = await previewRef.current?.renderToJpegBlob({
      width: 225,
      height: 315,
    });
    thumbnailBlob = blob ?? null;
  } catch {
    // eslint-disable-next-line no-console
    console.error(errorMessage);
  }
  return thumbnailBlob;
}

function mapCardRecordToFormValues(templateId: TemplateId, record: CardRecord) {
  const mapped = cardRecordToCardData(record as CardRecord & { templateId: TemplateId });
  return applyInspectorDefaults(templateId, mapped);
}

async function settleSavingState(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, 300 - elapsed);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export function nextDuplicateTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(.*)\s\((\d+)\)$/);
  if (!match) {
    return `${trimmed} (2)`;
  }
  const base = match[1].trim();
  const suffix = Number(match[2]);
  if (!base || Number.isNaN(suffix)) {
    return `${trimmed} (2)`;
  }
  return `${base} (${suffix + 1})`;
}
