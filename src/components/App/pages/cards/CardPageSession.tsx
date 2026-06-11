"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import { useGetCard } from "@/api/hooks";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import type { EditorSaveContextValue } from "@/components/Providers/EditorSaveContext";
import { cardTemplatesById } from "@/data/card-templates";
import { resolveEffectiveFace } from "@/lib/card-face";
import { cardDataToCardRecordPatch, cardRecordToCardData } from "@/lib/card-record-mapper";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
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
  const rawTitle =
    (draftValue && "title" in draftValue && (draftValue as { title?: string | null }).title) || "";
  const hasTitle = Boolean(rawTitle && rawTitle.toString().trim().length > 0);
  const canSaveChanges = Boolean(
    currentTemplateId && hasTitle && (activeCardId && activeStatus === "saved" ? isDirty : true),
  );
  const canDuplicate = Boolean(activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);
  const [saveToken, setSaveToken] = useState(0);
  const [pairedFrontCount, setPairedFrontCount] = useState(0);
  const [pairedFrontIds, setPairedFrontIds] = useState<string[]>([]);
  const [activeFrontId, setActiveFrontId] = useState<string | null>(null);
  const [pairedBackId, setPairedBackId] = useState<string | null>(null);
  const [lastRememberedBackId, setLastRememberedBackId] = useState<string | null>(null);
  const [frontViewToken, setFrontViewToken] = useState(0);
  const lastFaceRef = useRef<CardFace | null>(null);
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

  const sortByRecent = (cards: CardRecord[]) =>
    cards.sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) return bViewed - aViewed;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });

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
        const matches = cards.filter((card) => frontIds.has(card.id));
        sortByRecent(matches);
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

  const handleSave = async (mode: "new" | "update") => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const currentDraftValue = methods.getValues() as CardDataByTemplate[TemplateId];
    const draftTitle =
      (currentDraftValue &&
      "title" in currentDraftValue &&
      (currentDraftValue as { title?: string | null }).title) ||
      "";
    if (!draftTitle || !draftTitle.toString().trim()) {
      return;
    }

    const startedAt = Date.now();
    setSavingMode(mode);

    let thumbnailBlob: Blob | null = null;
    try {
      const blob = await previewRef.current?.renderToJpegBlob({
        width: 225,
        height: 315,
      });
      thumbnailBlob = blob ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[card-page] Failed to render thumbnail blob");
    }

    const derivedName = (draftTitle ?? "").toString().trim() || `${templateId} card`;
    const patch = cardDataToCardRecordPatch(templateId, derivedName, currentDraftValue as never);
    const viewedAt = Date.now();

    let didSave = false;
    let didCreateNew = false;
    try {
      if (mode === "new") {
        const record = await apiClient.createCard({
          ...patch,
          templateId,
          status: "saved",
          thumbnailBlob,
          name: derivedName,
          lastViewedAt: viewedAt,
        });
        setActiveCard(templateId, record.id, record.status);
        navigate(`/cards/${record.id}`, { replace: true });
        const mapped = cardRecordToCardData(record as CardRecord & { templateId: TemplateId });
        resetWithSaved(applyInspectorDefaults(templateId, mapped));
        didSave = true;
        didCreateNew = true;
      } else if (mode === "update") {
        if (!activeCardId || activeStatus !== "saved") return;
        const record = await apiClient.updateCard(
          { ...patch, thumbnailBlob, lastViewedAt: viewedAt },
          { params: { id: activeCardId } },
        );
        if (record) {
          setActiveCard(templateId, record.id, record.status);
          const mapped = cardRecordToCardData(record as CardRecord & { templateId: TemplateId });
          resetWithSaved(applyInspectorDefaults(templateId, mapped));
          didSave = true;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[card-page] Failed to save card", error);
    } finally {
      if (didSave) {
        setSaveToken((prev) => prev + 1);
      }
      if (didCreateNew) {
        clearDraft();
        setDraftSourceCardId(null);
      }
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 300 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
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
    let thumbnailBlob: Blob | null = null;
    try {
      const blob = await previewRef.current?.renderToJpegBlob({
        width: 225,
        height: 315,
      });
      thumbnailBlob = blob ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[card-page] Failed to render thumbnail blob for repair");
    }
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
    const draftTitle =
      (currentValues && "title" in currentValues
        ? (currentValues as { title?: string | null }).title
        : "") || "";
    const nextDraft = {
      ...currentValues,
      ...(draftTitle ? { title: nextDuplicateTitle(String(draftTitle)) } : {}),
    } as CardDataByTemplate[TemplateId];
    setSelectedTemplateId(templateId);
    saveDraft(templateId, nextDraft, { sourceCardId: activeCardId ?? null });
    setDraftSourceCardId(activeCardId ?? null);
    resetWithSaved(applyInspectorDefaults(templateId, nextDraft));
    setActiveCard(templateId, null, null);
    navigate("/cards/new", { replace: true });
    if (withPairing) {
      // Pairing for new duplicates is not persisted; ignore for now.
    }
  };

  const editorSaveValue: EditorSaveContextValue = {
    saveCurrentCard,
    repairCurrentCardThumbnail,
    saveToken,
  };

  return {
    isDraftRoute,
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

function nextDuplicateTitle(title: string) {
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
