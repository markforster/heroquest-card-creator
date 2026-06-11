"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

export type RouteShellCapabilities = {
  repairCurrentCardThumbnail: () => Promise<boolean>;
};

export const noopRouteShellCapabilities: RouteShellCapabilities = {
  repairCurrentCardThumbnail: async () => false,
};

type RouteShellCapabilitiesProviderValue = {
  setCapabilities: (capabilities: RouteShellCapabilities) => void;
};

const RouteShellCapabilitiesValueContext = createContext<RouteShellCapabilities | null>(null);
const RouteShellCapabilitiesSetterContext =
  createContext<RouteShellCapabilitiesProviderValue | null>(null);

export function RouteShellCapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<RouteShellCapabilities>(
    noopRouteShellCapabilities,
  );

  const value = useMemo(
    () => ({ setCapabilities }),
    [],
  );

  return (
    <RouteShellCapabilitiesSetterContext.Provider value={value}>
      <RouteShellCapabilitiesValueContext.Provider value={capabilities}>
        {children}
      </RouteShellCapabilitiesValueContext.Provider>
    </RouteShellCapabilitiesSetterContext.Provider>
  );
}

export function useRouteShellCapabilities() {
  const capabilities = useContext(RouteShellCapabilitiesValueContext);
  if (!capabilities) {
    throw new Error(
      "useRouteShellCapabilities must be used within RouteShellCapabilitiesProvider",
    );
  }
  return capabilities;
}

export function usePublishRouteShellCapabilities(capabilities: RouteShellCapabilities) {
  const context = useContext(RouteShellCapabilitiesSetterContext);
  if (!context) {
    throw new Error(
      "usePublishRouteShellCapabilities must be used within RouteShellCapabilitiesProvider",
    );
  }
  const { setCapabilities } = context;

  useEffect(() => {
    setCapabilities(capabilities);
  }, [capabilities, setCapabilities]);

  useEffect(
    () => () => {
      setCapabilities(noopRouteShellCapabilities);
    },
    [setCapabilities],
  );
}
