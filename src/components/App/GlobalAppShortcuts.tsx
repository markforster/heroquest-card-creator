"use client";

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useRouteShellCapabilities } from "@/components/App/RouteShellCapabilitiesContext";
import { matchesKeyBinding } from "@/components/common/KeyBinding/keyBindingUtils";
import { useAppActions } from "@/components/Providers/AppActionsContext";

export default function GlobalAppShortcuts() {
  const navigate = useNavigate();
  const { focusPrimarySearch } = useRouteShellCapabilities();
  const {
    openRecent,
    openSettings,
    isAssetsOpen,
    isRecentOpen,
    isSettingsOpen,
    isStockpileOpen,
    isTemplatePickerOpen,
  } = useAppActions();

  const isSuppressed =
    isAssetsOpen || isRecentOpen || isSettingsOpen || isStockpileOpen || isTemplatePickerOpen;

  const handlers = useMemo(
    () => ({
      r: () => openRecent(),
      d: () => navigate("/decks"),
      c: () => navigate("/cards"),
      a: () => navigate("/assets"),
      q: () => openSettings(),
      s: () => focusPrimarySearch(),
    }),
    [focusPrimarySearch, navigate, openRecent, openSettings],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSuppressed || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      const handler = handlers[key as keyof typeof handlers];
      if (!handler) return;
      if (!matchesKeyBinding(event, { key })) return;
      event.preventDefault();
      void handler();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, isSuppressed]);

  return null;
}
