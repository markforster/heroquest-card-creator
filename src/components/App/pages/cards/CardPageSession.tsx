"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import type { CardRecord } from "@/api/cards";
import { useGetCard } from "@/api/hooks";
import { createCardPageActions } from "@/components/App/pages/cards/cardPageActions";
import { useCardFacePairing } from "@/components/App/pages/cards/useCardFacePairing";
import { useUnsavedChangesGuardControls } from "@/components/App/UnsavedChangesGuardContext";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import type { EditorSaveContextValue } from "@/components/Providers/EditorSaveContext";
import { cardTemplatesById } from "@/data/card-templates";
import { resolveEffectiveFace } from "@/lib/card-face";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { loadDraft, saveDraft } from "@/lib/draft-storage";
import { applyInspectorDefaults, createEditorDefaultValues } from "@/lib/editor-form";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { TemplateId } from "@/types/templates";

type UseCardPageSessionArgs = {
  previewRef: React.RefObject<CardPreviewHandle>;
};

export function useCardPageSession({ previewRef }: UseCardPageSessionArgs) {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { bypassNextNavigation } = useUnsavedChangesGuardControls();
  const { track } = useAnalytics();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate, activeCardStatusByTemplate },
    setActiveCard,
    setSelectedTemplateId,
  } = useCardEditor();
  const { methods, resetWithSaved } = useEditorForm();
  const { control } = methods;
  const { isDirty } = useFormState({ control });
  const editorValues = useWatch({ control }) as CardDataByTemplate[TemplateId] | undefined;

  const normalizedCardId = cardId && cardId.trim().length > 0 ? cardId : null;
  const isDraftRoute = normalizedCardId === "new";
  const isSavedCardDetailRoute = Boolean(normalizedCardId && normalizedCardId !== "new");

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const activeStatus =
    currentTemplateId != null ? activeCardStatusByTemplate[currentTemplateId] : undefined;
  const draftValue = editorValues;
  const rawName =
    (draftValue && "name" in draftValue && (draftValue as { name?: string | null }).name) || "";
  const hasName = Boolean(rawName && rawName.toString().trim().length > 0);
  const canSaveChanges = Boolean(
    currentTemplateId && hasName && (activeCardId && activeStatus === "saved" ? isDirty : true),
  );
  const canDuplicate = Boolean(activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);
  const [saveToken, setSaveToken] = useState(0);
  const [routeError, setRouteError] = useState<"not-found" | "load-failed" | null>(null);
  const [draftSourceCardId, setDraftSourceCardId] = useState<string | null>(null);

  const effectiveFace = useMemo<CardFace | null>(() => {
    if (!selectedTemplate) return null;
    return resolveEffectiveFace(draftValue?.face, selectedTemplate.defaultFace);
  }, [draftValue?.face, selectedTemplate]);

  const shouldLoadCard = Boolean(isSavedCardDetailRoute && normalizedCardId);
  const getCardParams = useMemo(
    () => ({ params: { id: normalizedCardId ?? "" } }),
    [normalizedCardId],
  );
  const getCardOptions = useMemo(() => ({ enabled: shouldLoadCard }), [shouldLoadCard]);
  const { data: loadedCard, error: loadError } = useGetCard(getCardParams, getCardOptions);
  const lastLoadedRef = useRef<{ id: string; updatedAt?: number | null } | null>(null);

  useEffect(() => {
    if (!shouldLoadCard) {
      if (isDraftRoute) {
        setRouteError(null);
      }
      return;
    }
    if (loadError) {
      setRouteError("load-failed");
      return;
    }
    if (loadedCard === undefined) return;
    if (!loadedCard) {
      setRouteError("not-found");
      return;
    }
    setRouteError(null);
    const templateId = loadedCard.templateId as TemplateId;
    const lastLoaded = lastLoadedRef.current;
    const updatedAt = loadedCard.updatedAt ?? null;
    if (lastLoaded && lastLoaded.id === loadedCard.id && lastLoaded.updatedAt === updatedAt) {
      return;
    }
    lastLoadedRef.current = { id: loadedCard.id, updatedAt };
    const mapped = cardRecordToCardData(loadedCard as CardRecord & { templateId: TemplateId });
    const nextValues = applyInspectorDefaults(templateId, mapped);
    resetWithSaved(nextValues);
    setSelectedTemplateId(templateId);
    setActiveCard(templateId, loadedCard.id, loadedCard.status);
  }, [
    shouldLoadCard,
    loadedCard,
    loadError,
    resetWithSaved,
    setActiveCard,
    setSelectedTemplateId,
    isDraftRoute,
  ]);

  const draftInitKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isDraftRoute) {
      draftInitKeyRef.current = null;
      return;
    }
    const storedDraft = loadDraft();
    const storedTemplateId = storedDraft?.templateId ?? (selectedTemplateId as TemplateId | null);
    if (!storedTemplateId) return;
    const key = `draft:${storedTemplateId}`;
    if (draftInitKeyRef.current === key) return;
    draftInitKeyRef.current = key;
    if (storedDraft) {
      setSelectedTemplateId(storedDraft.templateId);
      resetWithSaved(storedDraft.data);
      setActiveCard(storedDraft.templateId, null, null);
      setDraftSourceCardId(storedDraft.sourceCardId ?? null);
      return;
    }
    const templateId = storedTemplateId as TemplateId;
    const nextValues = createEditorDefaultValues(templateId);
    resetWithSaved(nextValues);
    setActiveCard(templateId, null, null);
    saveDraft(templateId, nextValues, { sourceCardId: null });
    setDraftSourceCardId(null);
  }, [isDraftRoute, resetWithSaved, selectedTemplateId, setActiveCard, setSelectedTemplateId]);

  const autosaveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isDraftRoute) {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
      return;
    }
    if (!selectedTemplateId) return;
    if (activeCardId && activeStatus === "saved") return;
    if (!editorValues) return;
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = window.setTimeout(() => {
      saveDraft(selectedTemplateId as TemplateId, editorValues as CardDataByTemplate[TemplateId]);
    }, 250);
    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [isDraftRoute, selectedTemplateId, activeCardId, activeStatus, editorValues]);

  const {
    activeFrontId,
    frontViewToken,
    lastRememberedBackId,
    pairedBackId,
    pairedFrontCount,
    pairedFrontIds,
    setLastRememberedBackId,
  } = useCardFacePairing({
    activeCardId,
    effectiveFace,
  });

  const { duplicateCurrentCard, repairCurrentCardThumbnail, saveCurrentCard } =
    createCardPageActions({
      activeCardId,
      activeStatus,
      bypassNextNavigation,
      currentTemplateId,
      methods,
      navigate,
      previewRef,
      resetWithSaved,
      setActiveCard,
      setDraftSourceCardId,
      setSaveToken,
      setSavingMode,
      setSelectedTemplateId,
      track,
    });

  const editorSaveValue: EditorSaveContextValue = {
    saveCurrentCard,
    repairCurrentCardThumbnail,
    saveToken,
  };

  return {
    isDraftRoute,
    isEditorDirty: isDirty,
    normalizedCardId,
    selectedTemplate,
    activeFrontId,
    canDuplicate,
    canSaveChanges,
    currentTemplateId,
    draftSourceCardId,
    editorSaveValue,
    effectiveFace,
    frontViewToken,
    lastRememberedBackId,
    pairedBackId,
    pairedFrontCount,
    pairedFrontIds,
    routeError,
    savingMode,
    activeCardId,
    duplicateCurrentCard,
    saveCurrentCard,
    setLastRememberedBackId,
  };
}
