import { fireEvent, render, screen } from "@testing-library/react";

const mockUseDeckSelection = jest.fn();
const mockUseDeckSetEntries = jest.fn();
const mockUseDeckRightPanel = jest.fn();
const mockUseGetCard = jest.fn();
const mockCardPreview = jest.fn();

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  useDeckDetailSelection: () => mockUseDeckSelection(),
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => mockUseDeckSetEntries(),
}));

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => mockUseDeckRightPanel(),
}));

jest.mock("@/api/hooks", () => ({
  useGetCard: (...args: unknown[]) => mockUseGetCard(...args),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "label.preview") return "Preview";
      if (key === "actions.previous") return "Previous";
      if (key === "actions.next") return "Next";
      if (key === "decks.faces.front") return "Front faces";
      if (key === "decks.faces.back") return "Back faces";
      if (key === "decks.entries.empty.selectSet") return "Select a set to view entries.";
      if (key === "label.cards") return "Cards";
      return key;
    },
  }),
}));

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: function MockCardPreview(props: unknown) {
    mockCardPreview(props);
    return <div data-testid="card-preview" />;
  },
}));

jest.mock("@/lib/card-record-mapper", () => ({
  cardRecordToCardData: () => ({ title: "mapped" }),
}));

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { name: "Hero", background: { src: "/hero.png" } },
    monster: { name: "Monster", background: { src: "/monster.png" } },
    "labelled-back": { name: "Large Artwork", background: { src: "/back.png" } },
  },
}));

const DeckPreviewPanel =
  require("@/components/Decks/detail/DeckPreviewPanel").default as typeof import("@/components/Decks/detail/DeckPreviewPanel").default;

describe("DeckPreviewPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetCard.mockReturnValue({
      data: {
        id: "back-1",
        templateId: "labelled-back",
        name: "Back One",
        bodyTextStyle: "plain",
      },
    });
    mockUseDeckSelection.mockReturnValue({
      selectedSetId: "set-1",
      setById: new Map([["set-1", { id: "set-1", backFaceId: "back-1" }]]),
    });
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", sortIndex: 0 },
        { id: "entry-2", sortIndex: 1 },
      ],
      entryFrontIdByEntryId: new Map([
        ["entry-1", "front-1"],
        ["entry-2", "front-2"],
      ]),
    });
    mockUseDeckRightPanel.mockReturnValue({
      selectedEntryIds: new Set<string>(),
      activePreviewEntryId: null,
      previewSelectionSource: null,
      setActivePreviewEntryId: jest.fn(),
      backCards: [
        { id: "back-1", name: "Back One", templateId: "labelled-back" },
        { id: "front-1", name: "Front One", templateId: "hero" },
        { id: "front-2", name: "Front Two", templateId: "monster" },
      ],
    });
  });

  it("uses the selected entry front before the selected set back", () => {
    const setActivePreviewEntryId = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      selectedEntryIds: new Set(["entry-2"]),
      activePreviewEntryId: "entry-2",
      previewSelectionSource: null,
      setActivePreviewEntryId,
      backCards: [
        { id: "back-1", name: "Back One", templateId: "labelled-back" },
        { id: "front-2", name: "Front Two", templateId: "monster" },
      ],
    });
    mockUseGetCard.mockReturnValue({
      data: {
        id: "front-2",
        templateId: "monster",
        name: "Front Two",
        bodyTextStyle: "plain",
      },
    });

    render(<DeckPreviewPanel />);

    expect(screen.getByText("Front faces")).toBeInTheDocument();
    expect(screen.getByText("Front Two")).toBeInTheDocument();
    expect(screen.getByTestId("card-preview")).toBeInTheDocument();
    expect(mockCardPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "monster",
        suppressPreviewOnlyWarnings: true,
      }),
    );
    expect(setActivePreviewEntryId).not.toHaveBeenCalled();
  });

  it("shows the set back when preview focus is set even if entry fronts remain selected", () => {
    mockUseDeckRightPanel.mockReturnValue({
      selectedEntryIds: new Set(["entry-2"]),
      activePreviewEntryId: "entry-2",
      previewSelectionSource: "set",
      setActivePreviewEntryId: jest.fn(),
      backCards: [
        { id: "back-1", name: "Back One", templateId: "labelled-back" },
        { id: "front-2", name: "Front Two", templateId: "monster" },
      ],
    });

    render(<DeckPreviewPanel />);

    expect(screen.getByText("Back faces")).toBeInTheDocument();
    expect(screen.getByText("Back One")).toBeInTheDocument();
    expect(mockCardPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "labelled-back",
        suppressPreviewOnlyWarnings: true,
      }),
    );
  });

  it("falls back to the selected set back when no entry fronts are selected", () => {
    render(<DeckPreviewPanel />);

    expect(screen.getByText("Back faces")).toBeInTheDocument();
    expect(screen.getByText("Back One")).toBeInTheDocument();
    expect(screen.getByTestId("card-preview")).toBeInTheDocument();
    expect(mockCardPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "labelled-back",
        suppressPreviewOnlyWarnings: true,
      }),
    );
  });

  it("shows empty guidance when nothing previewable is selected", () => {
    mockUseDeckSelection.mockReturnValue({
      selectedSetId: null,
      setById: new Map(),
    });

    render(<DeckPreviewPanel />);

    expect(screen.getByText("Select a set to view entries.")).toBeInTheDocument();
    expect(screen.queryByTestId("card-preview")).not.toBeInTheDocument();
  });

  it("shows carousel controls for multiple selected entry fronts and navigates in board order", () => {
    const setActivePreviewEntryId = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      selectedEntryIds: new Set(["entry-1", "entry-2"]),
      activePreviewEntryId: "entry-1",
      setActivePreviewEntryId,
      backCards: [
        { id: "front-1", name: "Front One", templateId: "hero" },
        { id: "front-2", name: "Front Two", templateId: "monster" },
      ],
    });
    mockUseGetCard.mockReturnValue({
      data: {
        id: "front-1",
        templateId: "hero",
        name: "Front One",
        bodyTextStyle: "plain",
      },
    });

    render(<DeckPreviewPanel />);

    expect(screen.getByText("2 Cards")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(setActivePreviewEntryId).toHaveBeenCalledWith("entry-2");
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(setActivePreviewEntryId).toHaveBeenCalledWith("entry-2");
  });

  it("clamps the active preview entry when the stored target is no longer selected", () => {
    const setActivePreviewEntryId = jest.fn();
    mockUseDeckRightPanel.mockReturnValue({
      selectedEntryIds: new Set(["entry-1", "entry-2"]),
      activePreviewEntryId: "missing-entry",
      setActivePreviewEntryId,
      backCards: [
        { id: "front-1", name: "Front One", templateId: "hero" },
        { id: "front-2", name: "Front Two", templateId: "monster" },
      ],
    });
    mockUseGetCard.mockReturnValue({
      data: {
        id: "front-1",
        templateId: "hero",
        name: "Front One",
        bodyTextStyle: "plain",
      },
    });

    render(<DeckPreviewPanel />);

    expect(setActivePreviewEntryId).toHaveBeenCalledWith("entry-1");
    expect(screen.getByText("Front One")).toBeInTheDocument();
  });
});
