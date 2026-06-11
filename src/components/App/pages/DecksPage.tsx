"use client";

import { useEffect } from "react";

import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import DecksRoutePanels from "@/components/Decks/DecksRoutePanels";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";

export default function DecksPage() {
  const { track } = useAnalytics();

  usePublishRouteShellCapabilities(noopRouteShellCapabilities);

  useEffect(() => {
    track("page_view", { page_path: "/decks", page_title: "Decks" });
  }, [track]);

  return <DecksRoutePanels />;
}
