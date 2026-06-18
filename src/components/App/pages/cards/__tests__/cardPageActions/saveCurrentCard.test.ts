import { createCardPageActions } from "@/components/App/pages/cards/cardPageActions";

const createCardMock = jest.fn();
const clearDraftMock = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    createCard: (...args: unknown[]) => createCardMock(...args),
  },
}));

jest.mock("@/lib/draft-storage", () => ({
  clearDraft: () => clearDraftMock(),
  saveDraft: jest.fn(),
}));

describe("createCardPageActions saveCurrentCard", () => {
  beforeEach(() => {
    createCardMock.mockReset();
    clearDraftMock.mockReset();
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
      expect.objectContaining({
        templateId: "labelled-back",
        name: "Treasure Deck",
        title: undefined,
      }),
    );
  });
});
