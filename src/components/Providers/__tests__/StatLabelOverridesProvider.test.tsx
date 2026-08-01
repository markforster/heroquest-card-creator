const loadStatLabelOverrides = jest.fn(() => ({ attack: "Attack" }));
const saveStatLabelOverrides = jest.fn();

jest.mock("@/lib/stat-labels", () => ({
  DEFAULT_STAT_LABELS: {},
  loadStatLabelOverrides: () => loadStatLabelOverrides(),
  saveStatLabelOverrides: (next: unknown) => saveStatLabelOverrides(next),
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import StatLabelOverridesProvider, {
  useStatLabelOverrides,
} from "@/components/Providers/StatLabelOverridesProvider";

import type { ReactNode } from "react";

describe("StatLabelOverridesProvider", () => {
  it("loads and persists replacement label overrides", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StatLabelOverridesProvider>{children}</StatLabelOverridesProvider>
    );
    const { result } = renderHook(() => useStatLabelOverrides(), { wrapper });
    await waitFor(() => expect(result.current.overrides).toEqual({ attack: "Attack" }));

    const replacement = { defend: "Defend" } as never;
    act(() => result.current.setOverrides(replacement));
    expect(result.current.overrides).toBe(replacement);
    expect(saveStatLabelOverrides).toHaveBeenCalledWith(replacement);
  });
});
