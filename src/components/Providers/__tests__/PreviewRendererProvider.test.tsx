import { act, renderHook, waitFor } from "@testing-library/react";

import {
  PreviewRendererProvider,
  usePreviewRenderer,
} from "@/components/Providers/PreviewRendererContext";

import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <PreviewRendererProvider>{children}</PreviewRendererProvider>;
}

describe("PreviewRendererProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("hydrates renderer settings and persists subsequent changes", async () => {
    window.localStorage.setItem(
      "hqcc.previewRendererSettings",
      JSON.stringify({ renderer: "webgl", rotationMode: "spin" }),
    );

    const { result } = renderHook(() => usePreviewRenderer(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.previewRenderer).toBe("webgl");
      expect(result.current.rotationMode).toBe("spin");
    });

    act(() => {
      result.current.setPreviewRenderer("svg");
      result.current.setRotationMode("pan");
      result.current.requestRecenter();
    });

    expect(result.current.previewRenderer).toBe("svg");
    expect(result.current.rotationMode).toBe("pan");
    expect(result.current.rotationResetToken).toBe(1);
    expect(result.current.recenterToken).toBe(1);
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("hqcc.previewRendererSettings") ?? "")).toEqual(
        { renderer: "svg", rotationMode: "pan" },
      );
    });
  });

  it("hydrates the legacy renderer setting and toggles back to SVG with a reset", async () => {
    window.localStorage.setItem("hqcc.previewRenderer", "webgl");
    const { result } = renderHook(() => usePreviewRenderer(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.previewRenderer).toBe("webgl"));

    act(() => result.current.togglePreviewRenderer());

    expect(result.current.previewRenderer).toBe("svg");
    expect(result.current.rotationResetToken).toBe(1);
  });

  it("uses defaults when stored settings cannot be parsed or written", async () => {
    window.localStorage.setItem("hqcc.previewRendererSettings", "not-json");
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const { result } = renderHook(() => usePreviewRenderer(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.previewRenderer).toBe("svg"));
    expect(result.current.rotationMode).toBe("pan");
  });
});
