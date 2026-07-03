import { createCardPageActions } from "@/components/App/pages/cards/cardPageActions";

const createCardMock = jest.fn();
const updateCardMock = jest.fn();
const clearDraftMock = jest.fn();
const invalidateCollectionsQueriesMock = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    createCard: (...args: unknown[]) => createCardMock(...args),
    updateCard: (...args: unknown[]) => updateCardMock(...args),
  },
}));

jest.mock("@/api/queryInvalidation", () => ({
  invalidateCollectionsQueries: (...args: unknown[]) => invalidateCollectionsQueriesMock(...args),
}));

jest.mock("@/lib/draft-storage", () => ({
  clearDraft: () => clearDraftMock(),
  saveDraft: jest.fn(),
}));

describe("createCardPageActions saveCurrentCard", () => {
  beforeEach(() => {
    createCardMock.mockReset();
    updateCardMock.mockReset();
    clearDraftMock.mockReset();
    invalidateCollectionsQueriesMock.mockReset();
  });

  it("persists labelled-back cards from the canonical name field without requiring title", async () => {
    createCardMock.mockResolvedValue({
      id: "card-1",
      templateId: "labelled-back",
      status: "saved",
      name: "Treasure Deck",
      nameLower: "treasure deck",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 2,
      title: undefined,
      bodyTextColor: "#231f20",
      bodyTextFitToBounds: false,
    });

    const previewRef = {
      current: {
        renderToJpegBlob: jest.fn().mockResolvedValue(new Blob(["thumb"], { type: "image/jpeg" })),
      },
    };

    const actions = createCardPageActions({
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "labelled-back",
      draftSourceCardId: "source-card",
      methods: {
        getValues: () =>
          ({
            name: "Treasure Deck",
            title: undefined,
            bodyTextColor: "#231f20",
            bodyTextFitToBounds: false,
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: previewRef as never,
      queryClient: {} as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await expect(actions.saveCurrentCard()).resolves.toBe(true);

    expect(createCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "labelled-back",
        name: "Treasure Deck",
        title: undefined,
        duplicateFromCardId: "source-card",
      }),
    );
    expect(invalidateCollectionsQueriesMock).toHaveBeenCalledTimes(1);
  });

  it("does not send duplicateFromCardId for ordinary new cards", async () => {
    createCardMock.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Hero",
      nameLower: "hero",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 2,
      title: "Hero",
      bodyTextColor: "#231f20",
      bodyTextFitToBounds: false,
    });

    const actions = createCardPageActions({
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "hero",
      draftSourceCardId: null,
      methods: {
        getValues: () =>
          ({
            name: "Hero",
            title: "Hero",
            bodyTextColor: "#231f20",
            bodyTextFitToBounds: false,
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: { current: { renderToJpegBlob: jest.fn().mockResolvedValue(null) } } as never,
      queryClient: {} as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await actions.saveCurrentCard();

    expect(createCardMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        duplicateFromCardId: expect.anything(),
      }),
    );
    expect(invalidateCollectionsQueriesMock).not.toHaveBeenCalled();
  });

  it("never sends duplicateFromCardId when updating an existing saved card", async () => {
    updateCardMock.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Hero",
      nameLower: "hero",
      createdAt: 100,
      updatedAt: 200,
      schemaVersion: 2,
      title: "Hero",
      bodyTextColor: "#231f20",
      bodyTextFitToBounds: false,
    });

    const actions = createCardPageActions({
      activeCardId: "card-1",
      activeStatus: "saved",
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "hero",
      draftSourceCardId: "source-card",
      methods: {
        getValues: () =>
          ({
            name: "Hero",
            title: "Hero",
            bodyTextColor: "#231f20",
            bodyTextFitToBounds: false,
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: { current: { renderToJpegBlob: jest.fn().mockResolvedValue(null) } } as never,
      queryClient: {} as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await actions.saveCurrentCard();

    expect(updateCardMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        duplicateFromCardId: expect.anything(),
      }),
      { params: { id: "card-1" } },
    );
    expect(createCardMock).not.toHaveBeenCalled();
    expect(invalidateCollectionsQueriesMock).not.toHaveBeenCalled();
  });

  it("returns false when required card name is missing", async () => {
    const actions = createCardPageActions({
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "hero",
      methods: {
        getValues: () =>
          ({
            name: "",
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: { current: null } as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await expect(actions.saveCurrentCard()).resolves.toBe(false);
    expect(createCardMock).not.toHaveBeenCalled();
    expect(updateCardMock).not.toHaveBeenCalled();
  });

  it("returns false when create fails", async () => {
    createCardMock.mockRejectedValue(new Error("save failed"));

    const actions = createCardPageActions({
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "hero",
      methods: {
        getValues: () =>
          ({
            name: "Hero",
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: { current: { renderToJpegBlob: jest.fn().mockResolvedValue(null) } } as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await expect(actions.saveCurrentCard()).resolves.toBe(false);
  });

  it("returns true after updating an existing saved card", async () => {
    updateCardMock.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Updated Hero",
      nameLower: "updated hero",
      createdAt: 100,
      updatedAt: 200,
      schemaVersion: 2,
      bodyTextColor: "#231f20",
      bodyTextFitToBounds: false,
    });

    const actions = createCardPageActions({
      activeCardId: "card-1",
      activeStatus: "saved",
      bypassNextNavigation: jest.fn(),
      currentTemplateId: "hero",
      methods: {
        getValues: () =>
          ({
            name: "Updated Hero",
          }) as never,
      },
      navigate: jest.fn(),
      previewRef: { current: { renderToJpegBlob: jest.fn().mockResolvedValue(null) } } as never,
      resetWithSaved: jest.fn(),
      setActiveCard: jest.fn(),
      setDraftSourceCardId: jest.fn(),
      setSaveToken: jest.fn(),
      setSavingMode: jest.fn(),
      setSelectedTemplateId: jest.fn(),
      track: jest.fn(),
    });

    await expect(actions.saveCurrentCard()).resolves.toBe(true);
    expect(updateCardMock).toHaveBeenCalledTimes(1);
  });
});
