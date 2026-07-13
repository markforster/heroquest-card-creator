"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import CardEditorWorkspace from "@/components/App/pages/cards/CardEditorWorkspace";
import { useCardExportController } from "@/components/App/pages/cards/CardExportController";
import { useCardPageSession } from "@/components/App/pages/cards/CardPageSession";
import { refreshCardThumbnailsBatch } from "@/components/App/pages/cards/cardThumbnailRefresh";
import HiddenCardThumbnailRefreshHost, {
  type HiddenCardThumbnailRefreshHostHandle,
} from "@/components/App/pages/cards/HiddenCardThumbnailRefreshHost";
import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import { usePublishUnsavedChangesGuard } from "@/components/App/UnsavedChangesGuardContext";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { EditorSaveProvider } from "@/components/Providers/EditorSaveContext";
import { useI18n } from "@/i18n/I18nProvider";
import { invalidateCardThumbnail } from "@/lib/card-thumbnail-cache";

export default function CardPage() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const previewRef = useRef<CardPreviewHandle>(null!);
  const thumbnailRefreshHostRef = useRef<HiddenCardThumbnailRefreshHostHandle>(null);
  const session = useCardPageSession({ previewRef });
  const exportController = useCardExportController({
    activeCardId: session.activeCardId,
    effectiveFace: session.effectiveFace,
    pairedBackId: session.pairedBackId,
    pairedFrontCount: session.pairedFrontCount,
    pairedFrontIds: session.pairedFrontIds,
    activeFrontId: session.activeFrontId,
    previewRef,
  });
  const shellCapabilities = useMemo(
    () => ({
      ...noopRouteShellCapabilities,
      repairCurrentCardThumbnail: session.editorSaveValue.repairCurrentCardThumbnail,
    }),
    [session.editorSaveValue.repairCurrentCardThumbnail],
  );

  usePublishRouteShellCapabilities(shellCapabilities);
  usePublishUnsavedChangesGuard(
    useMemo(
      () => ({
        enabled: true,
        isDirty: session.isEditorDirty,
        title: t("heading.discardChanges"),
        body: t("confirm.leaveCardEditorBody"),
        saveCurrentCard: session.saveCurrentCard,
      }),
      [session.isEditorDirty, session.saveCurrentCard, t],
    ),
  );

  useEffect(() => {
    if (session.isDraftRoute) {
      track("page_view", { page_path: "/cards/new", page_title: "New Card" });
      return;
    }
    track("page_view", { page_path: "/cards/:id", page_title: "Card Detail" });
  }, [session.isDraftRoute, session.normalizedCardId, track]);

  const refreshCardThumbnails = useCallback(async (cardIds: string[]) => {
    const prioritizedCardIds =
      session.normalizedCardId && cardIds.includes(session.normalizedCardId)
        ? [
            ...cardIds.filter((cardId) => cardId !== session.normalizedCardId),
            session.normalizedCardId,
          ]
        : cardIds;

    await refreshCardThumbnailsBatch({
      cardIds: prioritizedCardIds,
      getCard: async (cardId) => {
        return await apiClient.getCard({ params: { id: cardId } });
      },
      renderThumbnail: async (card) => {
        return (await thumbnailRefreshHostRef.current?.renderThumbnail(card)) ?? null;
      },
      updateCardThumbnail: async (cardId, thumbnailBlob) => {
        return await apiClient.updateCardThumbnail({ thumbnailBlob }, { params: { id: cardId } });
      },
      readBackThumbnail: async (cardId) => {
        return await apiClient.getCardThumbnail({ params: { id: cardId } });
      },
      invalidateCardThumbnail,
      dispatchCardsUpdated: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
        }
      },
    });
  }, [session.normalizedCardId]);

  const editorSaveValue = useMemo(
    () => ({
      ...session.editorSaveValue,
      refreshCardThumbnails,
    }),
    [refreshCardThumbnails, session.editorSaveValue],
  );

  return (
    <EditorSaveProvider value={editorSaveValue}>
      <CardEditorWorkspace
        activeFrontId={session.activeFrontId}
        canDuplicate={session.canDuplicate}
        canSaveChanges={session.canSaveChanges}
        draftSourceCardId={session.draftSourceCardId}
        exportMenuItems={exportController.exportMenuItems}
        frontViewToken={session.frontViewToken}
        isRouteLoadingCard={session.isRouteLoadingCard}
        onBackToCards={() => navigate("/cards", { replace: true })}
        onDuplicate={() => {
          void session.duplicateCurrentCard(false);
        }}
        onDuplicateWithPairing={() => {
          void session.duplicateCurrentCard(true);
        }}
        onExportPng={exportController.onExportPng}
        onRememberBackId={session.setLastRememberedBackId}
        onSaveChanges={() => {
          void session.saveCurrentCard();
        }}
        preferredBackId={session.lastRememberedBackId}
        previewRef={previewRef}
        routeError={session.routeError}
        savingMode={session.savingMode}
        selectedTemplateId={session.currentTemplateId ?? undefined}
      />
      <HiddenCardThumbnailRefreshHost ref={thumbnailRefreshHostRef} />
      {exportController.exportUi}
    </EditorSaveProvider>
  );
}
