const touchCardLastViewed = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    touchCardLastViewed: (...args: unknown[]) => touchCardLastViewed(...args),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import { CardEditorProvider, useCardEditor } from "@/components/Providers/CardEditorContext";
import type { TemplateId } from "@/types/templates";

describe("CardEditorProvider", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CardEditorProvider>{children}</CardEditorProvider>
  );

  beforeEach(() => {
    window.localStorage.clear();
    touchCardLastViewed.mockReset().mockResolvedValue(undefined);
  });

  it("hydrates and persists active card state", async () => {
    const { result } = renderHook(() => useCardEditor(), { wrapper });
    await waitFor(() => expect(result.current.state.selectedTemplateId).not.toBeNull());
    const templateId = result.current.state.selectedTemplateId as TemplateId;

    act(() => result.current.setActiveCard(templateId, "card-1", "saved"));

    await waitFor(() =>
      expect(result.current.state.activeCardIdByTemplate[templateId]).toBe("card-1"),
    );
    await waitFor(() =>
      expect(touchCardLastViewed).toHaveBeenCalledWith({}, { params: { id: "card-1" } }),
    );
    expect(window.localStorage.getItem("hqcc.activeCards.v1")).toContain("card-1");
  });

  it("resets active cards while preserving the selected template", async () => {
    const { result } = renderHook(() => useCardEditor(), { wrapper });
    await waitFor(() => expect(result.current.state.selectedTemplateId).not.toBeNull());
    const templateId = result.current.state.selectedTemplateId as TemplateId;

    act(() => result.current.setActiveCard(templateId, "card-1", "saved"));
    await waitFor(() =>
      expect(result.current.state.activeCardIdByTemplate[templateId]).toBe("card-1"),
    );

    act(() => result.current.resetActiveCards());

    await waitFor(() => expect(result.current.state.activeCardIdByTemplate).toEqual({}));
    expect(result.current.state.activeCardStatusByTemplate).toEqual({});
    expect(result.current.state.selectedTemplateId).toBe(templateId);
    await waitFor(() => expect(window.localStorage.getItem("hqcc.activeCards.v1")).toBeNull());
  });

  it("rejects hook usage outside the provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useCardEditor())).toThrow(
      "useCardEditor must be used within a CardEditorProvider",
    );

    consoleError.mockRestore();
  });
});
