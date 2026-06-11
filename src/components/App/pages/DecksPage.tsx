"use client";

import { useEffect } from "react";

import AppShell, { noopEditorSaveValue } from "@/components/App/AppShell";
import DecksRoutePanels from "@/components/Decks/DecksRoutePanels";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";

export default function DecksPage() {
  const { track } = useAnalytics();

  useEffect(() => {
    track("page_view", { page_path: "/decks", page_title: "Decks" });
  }, [track]);

  return (
    <AppShell editorSaveValue={noopEditorSaveValue}>
      <DecksRoutePanels />
    </AppShell>
  );
}
