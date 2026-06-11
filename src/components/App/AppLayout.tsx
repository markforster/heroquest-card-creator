"use client";

import AppShell from "@/components/App/AppShell";
import { RouteShellCapabilitiesProvider } from "@/components/App/RouteShellCapabilitiesContext";

export default function AppLayout() {
  return (
    <RouteShellCapabilitiesProvider>
      <AppShell />
    </RouteShellCapabilitiesProvider>
  );
}
