import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LibrarySettingsPanel from "@/components/Modals/SettingsModal/LibrarySettingsPanel";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { LibraryResetSummary } from "@/lib/data/library-reset";

const clearQueryClient = jest.fn();
const openImport = jest.fn();
const startExport = jest.fn();
const resetActiveCards = jest.fn();
const getLibraryResetSummary = jest.fn();
const resetLibraryData = jest.fn();
const invalidateCardThumbnail = jest.fn();
const readApiConfig = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    clear: () => clearQueryClient(),
  }),
}));

jest.mock("@/api/config", () => ({
  readApiConfig: () => readApiConfig(),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    resetActiveCards: () => resetActiveCards(),
  }),
}));

jest.mock("@/components/Providers/LibraryTransferContext", () => ({
  useLibraryTransfer: () => ({
    openImport: () => openImport(),
    startExport: () => startExport(),
  }),
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  invalidateCardThumbnail: () => invalidateCardThumbnail(),
}));

jest.mock("@/lib/data/library-reset", () => ({
  getLibraryResetSummary: () => getLibraryResetSummary(),
  resetLibraryData: () => resetLibraryData(),
}));

const emptySummary: LibraryResetSummary = {
  cards: 0,
  cardThumbnails: 0,
  cardComponents: 0,
  pairs: 0,
  assets: 0,
  heroBackLogos: 0,
  collections: 0,
  decks: 0,
  deckGroups: 0,
  deckSets: 0,
  deckEntries: 0,
  totalLibraryRecords: 0,
  isEmpty: true,
};

const nonEmptySummary: LibraryResetSummary = {
  ...emptySummary,
  cards: 2,
  assets: 1,
  totalLibraryRecords: 3,
  isEmpty: false,
};

function renderPanel() {
  return render(
    <I18nProvider>
      <LibrarySettingsPanel />
    </I18nProvider>,
  );
}

describe("LibrarySettingsPanel (UI)", () => {
  beforeEach(() => {
    clearQueryClient.mockReset();
    openImport.mockReset();
    startExport.mockReset();
    resetActiveCards.mockReset();
    getLibraryResetSummary.mockReset().mockResolvedValue(emptySummary);
    resetLibraryData.mockReset().mockResolvedValue(nonEmptySummary);
    invalidateCardThumbnail.mockReset();
    readApiConfig.mockReset().mockReturnValue({ mode: "local", baseUrl: null, authToken: null });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows an empty-library state without an enabled destructive action", async () => {
    renderPanel();

    expect(await screen.findByText("This library is already empty.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^New$/i })).toBeDisabled();
    expect(screen.queryByText("Hero Back logos")).not.toBeInTheDocument();
    expect(screen.queryByText("Card components")).not.toBeInTheDocument();
  });

  it("renders the library settings copy from the active locale", async () => {
    window.localStorage.setItem("hqcc.language", "fr");

    renderPanel();

    expect(await screen.findByText("Bibliothèque")).toBeInTheDocument();
    expect(
      screen.getByText("Gérez la bibliothèque locale de cartes stockée dans ce navigateur."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Exporter$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Importer$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Nouvelle$/i })).toBeDisabled();
    expect(screen.getByText("Cette bibliothèque est déjà vide.")).toBeInTheDocument();
    expect(screen.queryByText("This library is already empty.")).not.toBeInTheDocument();
  });

  it("shows browser storage guidance with official help links", async () => {
    renderPanel();

    expect(
      await screen.findByText(
        "The app asks your browser for extra protection for your local library data where supported. Browser behavior varies, so regular library exports are still the safest way to protect your cards, decks, and assets.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Browser storage help:")).toBeInTheDocument();
    for (const browser of ["Chrome", "Edge", "Safari", "Firefox"]) {
      const link = screen.getByRole("link", { name: new RegExp(browser, "i") });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.queryByRole("button", { name: "Protect local data" })).not.toBeInTheDocument();
  });

  it("runs import from the library settings action row", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /^Import$/i }));

    expect(openImport).toHaveBeenCalledTimes(1);
  });

  it("requires acknowledgement before confirming the reset", async () => {
    getLibraryResetSummary.mockResolvedValue(nonEmptySummary);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /^New$/i }));

    const dialogButtons = screen.getAllByRole("button", { name: /Start new library/i });
    const confirmButton = dialogButtons[dialogButtons.length - 1];
    expect(confirmButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(
        "I understand that starting a new library will permanently clear my current library data.",
      ),
    );

    expect(confirmButton).toBeEnabled();
  });

  it("runs export from the confirmation modal without resetting the library", async () => {
    getLibraryResetSummary.mockResolvedValue(nonEmptySummary);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /^New$/i }));
    const exportButtons = screen.getAllByRole("button", { name: /Export library/i });
    fireEvent.click(exportButtons[exportButtons.length - 1]!);

    expect(startExport).toHaveBeenCalledTimes(1);
    expect(resetLibraryData).not.toHaveBeenCalled();
  });

  it("resets state and shows completion after confirmed reset", async () => {
    getLibraryResetSummary
      .mockResolvedValueOnce(nonEmptySummary)
      .mockResolvedValueOnce(emptySummary);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /^New$/i }));
    fireEvent.click(
      screen.getByLabelText(
        "I understand that starting a new library will permanently clear my current library data.",
      ),
    );
    const startButtons = screen.getAllByRole("button", { name: /Start new library/i });
    fireEvent.click(startButtons[startButtons.length - 1]!);

    await waitFor(() => expect(resetLibraryData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Library cleared")).toBeInTheDocument());
    expect(invalidateCardThumbnail).toHaveBeenCalledTimes(1);
    expect(clearQueryClient).toHaveBeenCalledTimes(1);
    expect(resetActiveCards).toHaveBeenCalledTimes(1);
  });
});
