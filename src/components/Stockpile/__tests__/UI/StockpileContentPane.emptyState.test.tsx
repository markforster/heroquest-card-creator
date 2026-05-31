import { fireEvent, render, screen } from "@testing-library/react";

import StockpileContentPane from "@/components/Stockpile/StockpileContentPane";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { StockpileCardActions } from "@/components/Stockpile/types";

jest.mock("@/components/Stockpile/StockpileCardsGrid", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-cards-grid" />,
}));

jest.mock("@/components/Stockpile/StockpileCardsTable", () => ({
  __esModule: true,
  default: () => <div data-testid="stockpile-cards-table" />,
}));

const mockOpenImport = jest.fn();
const mockUseLibraryTransfer = jest.fn();

jest.mock("@/components/Providers/LibraryTransferContext", () => ({
  __esModule: true,
  useLibraryTransfer: () => mockUseLibraryTransfer(),
}));

function createActions(): StockpileCardActions {
  return {
    onCardClick: jest.fn(),
    onCardSetSelected: jest.fn(),
    onCardSelectSingle: jest.fn(),
    onCardDoubleClick: jest.fn(),
    onPairHoverEnter: jest.fn(),
    onPairHoverLeave: jest.fn(),
    onTableThumbEnter: jest.fn(),
    onTableThumbLeave: jest.fn(),
    onConflictHoverEnter: jest.fn(),
    onConflictHoverLeave: jest.fn(),
  };
}

type RenderOptions = {
  search?: string;
  frame?: "panel" | "modal";
  isLibraryEmpty?: boolean;
  hasActiveNarrowing?: boolean;
};

function renderPane({
  search = "",
  frame = "panel",
  isLibraryEmpty = true,
  hasActiveNarrowing = false,
}: RenderOptions = {}) {
  return render(
    <I18nProvider>
      <StockpileContentPane
        filteredCards={[]}
        search={search}
        activeFilter={{ type: "all" }}
        templateFilter="all"
        totalCount={0}
        filterLabel="All types"
        frame={frame}
        isLibraryEmpty={isLibraryEmpty}
        hasActiveNarrowing={hasActiveNarrowing}
        isTableView={false}
        cardViews={[]}
        cardActions={createActions()}
        conflictPopoverCardId={null}
        isPairMode={false}
        dragEnabled={false}
        onClearSelection={() => {}}
        tableHeaders={{
          card: "Card",
          name: "Name",
          type: "Type",
          face: "Face",
          modified: "Modified",
          pairing: "Pairing",
        }}
      />
    </I18nProvider>,
  );
}

describe("StockpileContentPane empty state (UI)", () => {
  beforeEach(() => {
    mockUseLibraryTransfer.mockReturnValue({
      openImport: mockOpenImport,
      isBusy: false,
      isImporting: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders onboarding content and sample-library link when the panel library is empty", () => {
    renderPane();

    expect(screen.getByRole("heading", { name: "Your card library is empty" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "HeroQuest Card Creator does not ship with preloaded cards. You can create your own cards, or start with Mark's free sample library.",
      ),
    ).toBeInTheDocument();

    const downloadLink = screen.getByRole("link", { name: "Download sample library" });
    expect(downloadLink).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/download/v0.5.6/heroquest-card-creator_0_5_6--sample-library.hqcc",
    );
    expect(downloadLink).toHaveAttribute("target", "_blank");
    expect(downloadLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    expect(screen.getByRole("button", { name: "Import library" })).toBeEnabled();
    expect(screen.getByText("To load the sample library into this app:")).toBeInTheDocument();
    expect(screen.getByText("Click Download sample library and save the .hqcc file.")).toBeInTheDocument();
    expect(screen.getByText("Click Import library.")).toBeInTheDocument();
    expect(screen.getByText("Select the downloaded .hqcc file when prompted.")).toBeInTheDocument();
    expect(screen.getByText("Confirm the import to load the sample cards.")).toBeInTheDocument();
  });

  it("calls openImport when clicking the Import button in empty state", () => {
    renderPane();

    fireEvent.click(screen.getByRole("button", { name: "Import library" }));
    expect(mockOpenImport).toHaveBeenCalledTimes(1);
  });

  it("disables Import button when import context is busy", () => {
    mockUseLibraryTransfer.mockReturnValue({
      openImport: mockOpenImport,
      isBusy: true,
      isImporting: false,
    });

    renderPane();

    expect(screen.getByRole("button", { name: "Import library" })).toBeDisabled();
  });

  it("shows importing label and disables button while importing", () => {
    mockUseLibraryTransfer.mockReturnValue({
      openImport: mockOpenImport,
      isBusy: true,
      isImporting: true,
    });

    renderPane();

    const importingButton = screen.getByRole("button", { name: "Importing…" });
    expect(importingButton).toBeDisabled();
  });

  it("does not render the incorrect settings/import helper text", () => {
    renderPane();

    expect(
      screen.queryByText(
        "After downloading, open Settings and use Import data to import the .hqcc file into your library.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not render onboarding for narrowed empty states and shows the normal empty message", () => {
    renderPane({
      search: "wizard",
      hasActiveNarrowing: true,
    });

    expect(screen.queryByRole("heading", { name: "Your card library is empty" })).not.toBeInTheDocument();
    expect(screen.getByText("No cards found.")).toBeInTheDocument();
  });

  it("does not render onboarding in modal contexts", () => {
    renderPane({
      frame: "modal",
    });

    expect(screen.queryByRole("heading", { name: "Your card library is empty" })).not.toBeInTheDocument();
    expect(screen.getByText("No saved cards yet.")).toBeInTheDocument();
  });
});
