"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import DecksRoutePanels from "@/components/Decks/DecksRoutePanels";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";

export default function DecksPage() {
  const { track } = useAnalytics();
  const [focusPrimarySearchHandler, setFocusPrimarySearchHandler] = useState<(() => boolean) | null>(
    null,
  );

  const shellCapabilities = useMemo(
    () => ({
      ...noopRouteShellCapabilities,
      focusPrimarySearch: () => focusPrimarySearchHandler?.() ?? false,
    }),
    [focusPrimarySearchHandler],
  );

  usePublishRouteShellCapabilities(shellCapabilities);

  const handlePrimarySearchReady = useCallback((focusSearch: (() => boolean) | null) => {
    setFocusPrimarySearchHandler(() => focusSearch);
  }, []);

  useEffect(() => {
    track("page_view", { page_path: "/decks", page_title: "Decks" });
  }, [track]);

  return <DecksRoutePanels onPrimarySearchReady={handlePrimarySearchReady} />;
}
