import { act, renderHook, waitFor } from "@testing-library/react";

import {
  CollectionsTreeSettingsProvider,
  useCollectionsTreeSettings,
} from "@/components/Providers/CollectionsTreeSettingsContext";

import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <CollectionsTreeSettingsProvider>{children}</CollectionsTreeSettingsProvider>
);

describe("CollectionsTreeSettingsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("hydrates and mutates persisted tree settings", async () => {
    window.localStorage.setItem("hqcc.collectionsTreeEnabled", "1");
    window.localStorage.setItem("hqcc.collectionsTreeExpanded", JSON.stringify(["one", 2]));
    const { result } = renderHook(() => useCollectionsTreeSettings(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.enabled).toBe(true);
    expect(result.current.expandedPaths).toEqual(new Set(["one"]));
    expect(result.current.hasStoredExpandedPaths).toBe(true);

    act(() => {
      result.current.setEnabled(false);
      result.current.setExpandedPaths(["two"]);
      result.current.togglePath("three");
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.expandedPaths).toEqual(new Set(["two", "three"]));
    expect(window.localStorage.getItem("hqcc.collectionsTreeEnabled")).toBe("0");
  });

  it("becomes ready with defaults when stored values are malformed", async () => {
    window.localStorage.setItem("hqcc.collectionsTreeExpanded", "not-json");
    const { result } = renderHook(() => useCollectionsTreeSettings(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.expandedPaths).toEqual(new Set());
    expect(result.current.hasStoredExpandedPaths).toBe(false);
  });
});
