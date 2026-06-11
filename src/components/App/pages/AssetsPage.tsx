"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import { AssetsRoutePanels } from "@/components/Assets";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import {
  EditorSaveProvider,
  noopEditorSaveValue,
} from "@/components/Providers/EditorSaveContext";

export default function AssetsPage() {
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();

  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;

  usePublishRouteShellCapabilities(noopRouteShellCapabilities);

  useEffect(() => {
    track("page_view", { page_path: "/assets", page_title: "Assets" });
  }, [track]);

  useEscapeModalAware({
    id: "route:assets",
    isOpen: true,
    enabled: true,
    onEscape: () => {
      if (activeCardId) {
        navigate(`/cards/${activeCardId}`);
      } else {
        navigate("/cards");
      }
    },
  });

  return (
    <EditorSaveProvider value={noopEditorSaveValue}>
      <AssetsRoutePanels />
    </EditorSaveProvider>
  );
}
