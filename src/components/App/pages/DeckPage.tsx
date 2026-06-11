"use client";

import { useEffect } from "react";

import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import DecksRoutePanels from "@/components/Decks/DecksRoutePanels";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";

export default function DeckPage() {
  const { track } = useAnalytics();

  usePublishRouteShellCapabilities(noopRouteShellCapabilities);

  useEffect(() => {
    track("page_view", { page_path: "/decks/:id", page_title: "Deck Detail" });
  }, [track]);

  return <DecksRoutePanels />;
}
