import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { createDefaultCardData } from "@/types/card-data";

describe("draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("saves and loads a draft with its source card", () => {
    const data = createDefaultCardData("hero");

    saveDraft("hero", data, { sourceCardId: "source-card" });

    expect(loadDraft()).toEqual({
      templateId: "hero",
      data,
      sourceCardId: "source-card",
    });
  });

  it("removes a previously stored source when explicitly cleared", () => {
    const data = createDefaultCardData("hero");
    saveDraft("hero", data, { sourceCardId: "source-card" });

    saveDraft("hero", data, { sourceCardId: null });

    expect(loadDraft()?.sourceCardId).toBeNull();
  });

  it("clears all current draft keys", () => {
    const data = createDefaultCardData("monster");
    saveDraft("monster", data, { sourceCardId: "source-card" });

    clearDraft();

    expect(loadDraft()).toBeNull();
    expect(window.localStorage.getItem("hqcc.draft.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.draftTemplateId.v1")).toBeNull();
    expect(window.localStorage.getItem("hqcc.draftSourceCardId.v1")).toBeNull();
  });

  it("ignores malformed current data", () => {
    window.localStorage.setItem("hqcc.draftTemplateId.v1", "hero");
    window.localStorage.setItem("hqcc.draft.v1", "not-json");

    expect(loadDraft()).toBeNull();
  });

  it("migrates the selected legacy template and removes legacy storage", () => {
    const hero = createDefaultCardData("hero");
    const monster = createDefaultCardData("monster");
    window.localStorage.setItem("hqcc.selectedTemplateId", "monster");
    window.localStorage.setItem(
      "hqcc.cardDrafts.v1",
      JSON.stringify({ hero, monster, unsupported: {} }),
    );

    expect(loadDraft()).toEqual({ templateId: "monster", data: monster });
    expect(window.localStorage.getItem("hqcc.draftTemplateId.v1")).toBe("monster");
    expect(window.localStorage.getItem("hqcc.cardDrafts.v1")).toBeNull();
  });

  it("tolerates storage write and removal failures", () => {
    const data = createDefaultCardData("hero");
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(() => saveDraft("hero", data)).not.toThrow();

    jest.restoreAllMocks();
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(() => clearDraft()).not.toThrow();
  });
});
