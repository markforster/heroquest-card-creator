"use client";

import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import CardEditorWorkspace from "@/components/App/pages/cards/CardEditorWorkspace";
import { useCardExportController } from "@/components/App/pages/cards/CardExportController";
import { useCardPageSession } from "@/components/App/pages/cards/CardPageSession";
import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { EditorSaveProvider } from "@/components/Providers/EditorSaveContext";

export default function CardPage() {
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const previewRef = useRef<CardPreviewHandle>(null!);
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

  useEffect(() => {
    if (session.isDraftRoute) {
      track("page_view", { page_path: "/cards/new", page_title: "New Card" });
      return;
    }
    track("page_view", { page_path: "/cards/:id", page_title: "Card Detail" });
  }, [session.isDraftRoute, session.normalizedCardId, track]);

  return (
    <EditorSaveProvider value={session.editorSaveValue}>
      <CardEditorWorkspace
        activeFrontId={session.activeFrontId}
        canDuplicate={session.canDuplicate}
        canSaveChanges={session.canSaveChanges}
        draftSourceCardId={session.draftSourceCardId}
        exportMenuItems={exportController.exportMenuItems}
        frontViewToken={session.frontViewToken}
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
      {exportController.exportUi}
    </EditorSaveProvider>
  );
}
