const supportsWebgl = jest.fn();

jest.mock("@/lib/webgl", () => ({ supportsWebgl: (...args: unknown[]) => supportsWebgl(...args) }));

import { renderHook } from "@testing-library/react";

import { useWebglSupport } from "@/hooks/useWebglSupport";

describe("useWebglSupport", () => {
  beforeEach(() => supportsWebgl.mockReset());

  it("preserves WebGL mode when supported", () => {
    supportsWebgl.mockReturnValue(true);
    const setRenderer = jest.fn();
    expect(renderHook(() => useWebglSupport("webgl", setRenderer)).result.current).toBe(true);
    expect(setRenderer).not.toHaveBeenCalled();
  });

  it("falls back to SVG when WebGL is unavailable", () => {
    supportsWebgl.mockReturnValue(false);
    const setRenderer = jest.fn();
    expect(renderHook(() => useWebglSupport("webgl", setRenderer)).result.current).toBe(false);
    expect(setRenderer).toHaveBeenCalledWith("svg");
  });
});
