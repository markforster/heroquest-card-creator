import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mockListCollections = jest.fn();
const mockUpdateCollection = jest.fn();
const mockUseCardEditor = jest.fn();
const mockSetExpandedPaths = jest.fn();
const mockTogglePath = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRefetchQueries = jest.fn();

let mockTreeEnabled = false;
let mockExpandedPaths = new Set<string>();
let mockHasStoredExpandedPaths = false;
let mockTreeReady = true;

jest.mock("@/api/client", () => ({
  apiClient: {
    listCollections: (...args: unknown[]) => mockListCollections(...args),
    updateCollection: (...args: unknown[]) => mockUpdateCollection(...args),
  },
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => mockUseCardEditor(),
}));

jest.mock("@/components/Providers/CollectionsTreeSettingsContext", () => ({
  __esModule: true,
  useCollectionsTreeSettings: () => ({
    enabled: mockTreeEnabled,
    expandedPaths: mockExpandedPaths,
    setExpandedPaths: mockSetExpandedPaths,
    togglePath: mockTogglePath,
    hasStoredExpandedPaths: mockHasStoredExpandedPaths,
    isReady: mockTreeReady,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.collectionsForCard": "Collections for this card",
        "heading.addToCollections": "Add to collection",
        "empty.saveCardToManageCollections": "Save this card to manage collections.",
        "status.loadingCollections": "Loading collections...",
        "error.failedToLoadCollections": "Unable to load collections right now.",
        "empty.noCollections": "No collections yet.",
        "empty.cardNotInCollections": "This card is not in any collections.",
        "actions.remove": "Remove",
        "actions.add": "Add",
        "actions.removeFromCollection": "Remove from collection",
        "actions.addToCollection": "Add to collection",
        "actions.saving": "Saving…",
        "actions.confirm": "Confirm",
        "actions.cancel": "Cancel",
        "actions.close": "Close",
      };
      return lookup[key] ?? key;
    },
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    refetchQueries: (...args: unknown[]) => mockRefetchQueries(...args),
  }),
}));

import CollectionsInspectorPanel from "@/components/Cards/CardInspector/CollectionsInspectorPanel";

describe("CollectionsInspectorPanel", () => {
  beforeEach(() => {
    mockListCollections.mockReset();
    mockUpdateCollection.mockReset();
    mockUseCardEditor.mockReset();
    mockSetExpandedPaths.mockReset();
    mockTogglePath.mockReset();
    mockInvalidateQueries.mockReset();
    mockRefetchQueries.mockReset();

    mockInvalidateQueries.mockResolvedValue(undefined);
    mockRefetchQueries.mockResolvedValue(undefined);

    mockTreeEnabled = false;
    mockExpandedPaths = new Set<string>();
    mockHasStoredExpandedPaths = false;
    mockTreeReady = true;
  });

  it("shows save-first state when active card is not saved", () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: undefined },
        activeCardStatusByTemplate: { hero: "draft" },
      },
    });

    render(<CollectionsInspectorPanel />);

    expect(screen.getByText("Save this card to manage collections.")).toBeInTheDocument();
    expect(mockListCollections).not.toHaveBeenCalled();
  });

  it("shows loading state while collections are being fetched", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockReturnValue(new Promise(() => {}));

    render(<CollectionsInspectorPanel />);

    expect(await screen.findByText("Loading collections...")).toBeInTheDocument();
  });

  it("shows error state when collections fail to load", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockRejectedValue(new Error("load failed"));

    render(<CollectionsInspectorPanel />);

    expect(await screen.findByText("Unable to load collections right now.")).toBeInTheDocument();
  });

  it("shows empty state when there are no collections", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([]);

    render(<CollectionsInspectorPanel />);

    expect(await screen.findByText("This card is not in any collections.")).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "Add to collection" });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveTextContent("");
  });

  it("renders only current memberships in the main panel and omits stockpile pseudo-filters", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quest Set",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
      {
        id: "col-2",
        name: "Bosses",
        cardIds: ["card-1", "other-card"],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    const membershipRow = await screen.findByTitle("Bosses");

    expect(screen.getByText("Collections for this card")).toBeInTheDocument();
    expect(await screen.findByText("Bosses")).toBeInTheDocument();
    expect(screen.queryByText("Quest Set")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove from collection: Bosses" })).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "Add to collection" });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveTextContent("");
    expect(within(membershipRow).queryByText("Remove")).not.toBeInTheDocument();
    expect(membershipRow.querySelector(`.${"stockpileCountBadge"}`)).toBeNull();
    expect(screen.queryByText("All cards")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent")).not.toBeInTheDocument();
    expect(screen.queryByText("Unfiled")).not.toBeInTheDocument();
  });

  it("renders grouped tree labels when collection tree mode is enabled", async () => {
    mockTreeEnabled = true;
    mockHasStoredExpandedPaths = true;
    mockExpandedPaths = new Set<string>();

    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quests/Quest 1",
        cardIds: ["card-1"],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    const folderRow = await screen.findByText("Quests");

    expect(folderRow).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quests" })).not.toBeInTheDocument();
    expect(mockTogglePath).not.toHaveBeenCalled();
    expect(screen.getByText("Quest 1")).toBeInTheDocument();
    fireEvent.click(folderRow);
    expect(mockTogglePath).not.toHaveBeenCalled();
    expect(screen.getByText("Quest 1")).toBeInTheDocument();
    expect(folderRow.closest(".d-flex")).toHaveClass("d-flex", "align-items-center", "gap-2");
  });

  it("shows grouped main-panel memberships expanded by default even when stored paths are collapsed", async () => {
    mockTreeEnabled = true;
    mockHasStoredExpandedPaths = true;
    mockExpandedPaths = new Set<string>();

    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quests/Quest 1",
        cardIds: ["card-1"],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    const folderRow = await screen.findByText("Quests");
    expect(folderRow).toBeInTheDocument();
    expect(folderRow.closest(".d-flex")).toHaveClass("d-flex", "align-items-center", "gap-2");
    expect(screen.getByText("Quest 1")).toBeInTheDocument();
  });

  it("shows grouped modal tree expanded to reveal memberships and remains collapsible", async () => {
    mockTreeEnabled = true;
    mockHasStoredExpandedPaths = true;
    mockExpandedPaths = new Set<string>();

    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quests/Arcane/Quest 1",
        cardIds: ["card-1"],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
      {
        id: "col-2",
        name: "Quests/Mundane/Quest 2",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Add to collection" }));

    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    const folderButton = modalQueries.getByRole("button", { name: "Quests" });
    expect(folderButton).toBeInTheDocument();
    expect(modalQueries.getByRole("button", { name: "Arcane" })).toBeInTheDocument();
    expect(modalQueries.getByText("Quest 1")).toBeInTheDocument();
    expect(modalQueries.getByRole("button", { name: "Mundane" })).toBeInTheDocument();
    expect(modalQueries.queryByText("Quest 2")).not.toBeInTheDocument();

    fireEvent.click(folderButton);

    expect(modalQueries.queryByText("Quest 1")).not.toBeInTheDocument();
    expect(modalQueries.queryByText("Quest 2")).not.toBeInTheDocument();

    fireEvent.click(folderButton);

    expect(modalQueries.getByText("Quest 1")).toBeInTheDocument();
  });

  it("preserves modal folder expansion state while membership edits change the draft set", async () => {
    mockTreeEnabled = true;
    mockHasStoredExpandedPaths = true;
    mockExpandedPaths = new Set<string>();

    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quests/Arcane/Quest 1",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
      {
        id: "col-2",
        name: "Quests/Mundane/Quest 2",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Add to collection" }));

    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    fireEvent.click(modalQueries.getByRole("button", { name: "Quests" }));
    fireEvent.click(modalQueries.getByRole("button", { name: "Arcane" }));
    expect(modalQueries.getByText("Quest 1")).toBeInTheDocument();

    fireEvent.click(modalQueries.getByRole("button", { name: "Add to collection: Quests/Arcane/Quest 1" }));

    expect(modalQueries.getByRole("button", { name: "Arcane" })).toBeInTheDocument();
    expect(modalQueries.getByText("Quest 1")).toBeInTheDocument();

    fireEvent.click(
      modalQueries.getByRole("button", { name: "Remove from collection: Quests/Arcane/Quest 1" }),
    );

    expect(modalQueries.getByRole("button", { name: "Arcane" })).toBeInTheDocument();
    expect(modalQueries.getByText("Quest 1")).toBeInTheDocument();
  });

  it("opens the modal and shows the full unified tree", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections
      .mockResolvedValueOnce([
        {
          id: "col-1",
          name: "Quest Set",
          cardIds: [],
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
        {
          id: "col-2",
          name: "Bosses",
          cardIds: ["card-1"],
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ]);

    const { container } = render(<CollectionsInspectorPanel />);

    const addButton = await screen.findByRole("button", { name: "Add to collection" });
    expect(addButton).toHaveTextContent("");
    fireEvent.click(addButton);

    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    expect(modal).toBeInTheDocument();
    expect(modalQueries.getByText("Quest Set")).toBeInTheDocument();
    expect(modalQueries.getByText("Bosses")).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="collections-membership-modal"] .stockpileCountBadge'),
    ).toBeNull();
    expect(
      modalQueries.getByRole("button", { name: "Add to collection: Quest Set" }),
    ).toBeInTheDocument();
    expect(
      modalQueries.getByRole("button", { name: "Remove from collection: Bosses" }),
    ).toBeInTheDocument();
  });

  it("directly removes an existing membership from the main panel", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections
      .mockResolvedValueOnce([
        {
          id: "col-1",
          name: "Quest Set",
          cardIds: ["card-1", "card-2"],
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "col-1",
          name: "Quest Set",
          cardIds: ["card-2"],
          createdAt: 1,
          updatedAt: 2,
          schemaVersion: 1,
        },
      ]);
    mockUpdateCollection.mockResolvedValue({
      id: "col-1",
      name: "Quest Set",
      cardIds: ["card-2"],
      createdAt: 1,
      updatedAt: 2,
      schemaVersion: 1,
    });

    render(<CollectionsInspectorPanel />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Remove from collection: Quest Set" }),
    );

    await waitFor(() => {
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        { cardIds: ["card-2"] },
        { params: { id: "col-1" } },
      );
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
    expect(mockRefetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function), type: "active" }),
    );
    expect(await screen.findByText("This card is not in any collections.")).toBeInTheDocument();
  });

  it("does not persist modal draft changes until confirm", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quest Set",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Add to collection" }));
    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    fireEvent.click(modalQueries.getByRole("button", { name: "Add to collection: Quest Set" }));

    expect(
      modalQueries.getByRole("button", { name: "Remove from collection: Quest Set" }),
    ).toBeInTheDocument();
    expect(mockUpdateCollection).not.toHaveBeenCalled();
  });

  it("discards modal draft changes on cancel", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "Quest Set",
        cardIds: [],
        createdAt: 1,
        updatedAt: 1,
        schemaVersion: 1,
      },
    ]);

    render(<CollectionsInspectorPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Add to collection" }));
    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    fireEvent.click(modalQueries.getByRole("button", { name: "Add to collection: Quest Set" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("collections-membership-modal")).not.toBeInTheDocument();
    expect(screen.getByText("This card is not in any collections.")).toBeInTheDocument();
    expect(mockUpdateCollection).not.toHaveBeenCalled();
  });

  it("persists modal draft changes on confirm", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCollections
      .mockResolvedValueOnce([
        {
          id: "col-1",
          name: "Quest Set",
          cardIds: [],
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
        {
          id: "col-2",
          name: "Bosses",
          cardIds: ["card-1"],
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "col-1",
          name: "Quest Set",
          cardIds: ["card-1"],
          createdAt: 1,
          updatedAt: 2,
          schemaVersion: 1,
        },
        {
          id: "col-2",
          name: "Bosses",
          cardIds: [],
          createdAt: 1,
          updatedAt: 2,
          schemaVersion: 1,
        },
      ]);
    mockUpdateCollection.mockResolvedValue(null);

    render(<CollectionsInspectorPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Add to collection" }));
    const modal = screen.getByTestId("collections-membership-modal");
    const modalQueries = within(modal);

    fireEvent.click(modalQueries.getByRole("button", { name: "Add to collection: Quest Set" }));
    fireEvent.click(modalQueries.getByRole("button", { name: "Remove from collection: Bosses" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockUpdateCollection).toHaveBeenCalledTimes(2);
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        { cardIds: ["card-1"] },
        { params: { id: "col-1" } },
      );
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        { cardIds: [] },
        { params: { id: "col-2" } },
      );
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
    expect(mockRefetchQueries).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function), type: "active" }),
    );
    expect(await screen.findByText("Quest Set")).toBeInTheDocument();
    expect(screen.queryByText("Bosses")).not.toBeInTheDocument();
  });
});
