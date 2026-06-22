"use client";

import AppShell from "@/components/App/AppShell";
import { RouteShellCapabilitiesProvider } from "@/components/App/RouteShellCapabilitiesContext";
import { UnsavedChangesGuardProvider } from "@/components/App/UnsavedChangesGuardContext";

export default function AppLayout() {
  return (
    <RouteShellCapabilitiesProvider>
      <UnsavedChangesGuardProvider>
        <AppShell />
      </UnsavedChangesGuardProvider>
    </RouteShellCapabilitiesProvider>
  );
}
