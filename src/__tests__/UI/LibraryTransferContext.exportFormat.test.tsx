import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EscapeStackProvider } from "@/components/common/EscapeStackProvider";
import {
  LibraryTransferProvider,
  useLibraryTransfer,
} from "@/components/Providers/LibraryTransferContext";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const createBackupHqcc = jest.fn();
const importBackupHqcc = jest.fn();
const importBackupJson = jest.fn();

jest.mock("@/lib/backup", () => ({
  createBackupHqcc: (...args: unknown[]) => createBackupHqcc(...args),
  importBackupHqcc: (...args: unknown[]) => importBackupHqcc(...args),
  importBackupJson: (...args: unknown[]) => importBackupJson(...args),
}));

jest.mock("@/lib/tauri", () => ({
  openDownloadsFolderIfTauri: jest.fn(),
}));

function ExportHarness() {
  const { openExport, openImport, startExport } = useLibraryTransfer();

  return (
    <>
      <button type="button" onClick={openExport}>
        Open export
      </button>
      <button type="button" onClick={startExport}>
        Start export
      </button>
      <button type="button" onClick={openImport}>
        Open import
      </button>
    </>
  );
}

function renderHarness() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <LocalStorageProvider>
          <EscapeStackProvider>
            <LibraryTransferProvider>
              <ExportHarness />
            </LibraryTransferProvider>
          </EscapeStackProvider>
        </LocalStorageProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("LibraryTransferProvider export format", () => {
  beforeEach(() => {
    window.localStorage.clear();
    createBackupHqcc.mockResolvedValue({
      blob: new Blob(["backup"], { type: "application/zip" }),
      fileName: "library.hqcc",
    });
    importBackupHqcc.mockResolvedValue({
      cardsCount: 0,
      assetsCount: 0,
      collectionsCount: 0,
      decksCount: 0,
      deckGroupsCount: 0,
      deckSetsCount: 0,
      deckEntriesCount: 0,
    });
    importBackupJson.mockResolvedValue({
      cardsCount: 4,
      assetsCount: 3,
      collectionsCount: 2,
      decksCount: 1,
      deckGroupsCount: 0,
      deckSetsCount: 0,
      deckEntriesCount: 0,
    });
    window.alert = jest.fn();
    global.URL.createObjectURL = jest.fn(() => "blob:test");
    global.URL.revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows both export format options and defaults to the new format", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText("Export format")).toBeInTheDocument();
    expect(screen.getByLabelText("New HQCC format (recommended)")).toBeChecked();
    expect(screen.getByLabelText("HQCC 0.5.5 compatibility format")).not.toBeChecked();
  });

  it("exports with the selected legacy format", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open export" }));
    fireEvent.click(screen.getByLabelText("HQCC 0.5.5 compatibility format"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(createBackupHqcc).toHaveBeenCalledWith(
        expect.objectContaining({ format: "legacy-zip-json" }),
      );
    });
  });

  it("starts export immediately for nested modal contexts", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Start export" }));

    expect(await screen.findByText("Exporting data...")).toBeInTheDocument();
    await waitFor(() => {
      expect(createBackupHqcc).toHaveBeenCalledWith(
        expect.objectContaining({ format: "compact-zip-v1" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Exporting data...")).not.toBeInTheDocument();
    });
  });

  it("shows imported totals in an app modal instead of a native success alert", async () => {
    const { container } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open import" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = new File(["{}"], "library.hqcc.json", { type: "application/json" });
    Object.defineProperty(file, "slice", {
      value: () => ({
        arrayBuffer: async () => new Uint8Array([0x7b, 0x7d, 0x0a, 0x00]).buffer,
      }),
    });

    fireEvent.change(input!, {
      target: {
        files: [file],
      },
    });

    expect(await screen.findByRole("heading", { name: "Import complete." })).toBeInTheDocument();
    expect(screen.getByText("Cards")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Decks")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalledWith(expect.stringContaining("Import complete."));

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[closeButtons.length - 1]!);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Import complete." })).not.toBeInTheDocument();
    });
  });

  it("dismisses the import result modal through the escape stack", async () => {
    const { container } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open import" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    const input = container.querySelector('input[type="file"]');
    const file = new File(["{}"], "library.hqcc.json", { type: "application/json" });
    Object.defineProperty(file, "slice", {
      value: () => ({
        arrayBuffer: async () => new Uint8Array([0x7b, 0x7d, 0x0a, 0x00]).buffer,
      }),
    });

    fireEvent.change(input!, {
      target: {
        files: [file],
      },
    });

    expect(await screen.findByRole("heading", { name: "Import complete." })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Import complete." })).not.toBeInTheDocument();
    });
  });

  it("renders the import result modal from the active locale", async () => {
    window.localStorage.setItem("hqcc.language", "it");
    const { container } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open import" }));
    fireEvent.click(screen.getByRole("button", { name: "Importa" }));

    const input = container.querySelector('input[type="file"]');
    const file = new File(["{}"], "library.hqcc.json", { type: "application/json" });
    Object.defineProperty(file, "slice", {
      value: () => ({
        arrayBuffer: async () => new Uint8Array([0x7b, 0x7d, 0x0a, 0x00]).buffer,
      }),
    });

    fireEvent.change(input!, {
      target: {
        files: [file],
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Importazione completata." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Carte")).toBeInTheDocument();
    expect(screen.getByText("Risorse")).toBeInTheDocument();
    expect(screen.getByText("Raccolte")).toBeInTheDocument();
    expect(screen.getByText("Mazzi")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Import complete." })).not.toBeInTheDocument();
  });
});
