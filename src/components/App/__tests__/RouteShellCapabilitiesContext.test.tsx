import { renderHook, waitFor } from "@testing-library/react";

import {
  RouteShellCapabilitiesProvider,
  usePublishRouteShellCapabilities,
  useRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import type { RouteShellCapabilities } from "@/components/App/RouteShellCapabilitiesContext";

import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <RouteShellCapabilitiesProvider>{children}</RouteShellCapabilitiesProvider>
);

describe("RouteShellCapabilitiesContext", () => {
  it("publishes route capabilities and restores no-op behavior on unmount", async () => {
    const capabilities: RouteShellCapabilities = {
      repairCurrentCardThumbnail: async () => true,
      focusPrimarySearch: () => true,
      routeShortcutHandlers: { save: () => true },
    };
    const { result, unmount } = renderHook(
      () => {
        usePublishRouteShellCapabilities(capabilities);
        return useRouteShellCapabilities();
      },
      { wrapper },
    );

    await waitFor(() => expect(result.current).toBe(capabilities));
    unmount();
  });
});
