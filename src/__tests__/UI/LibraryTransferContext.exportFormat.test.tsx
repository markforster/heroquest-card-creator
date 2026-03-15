import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  LibraryTransferProvider,
  useLibraryTransfer,
} from "@/components/Providers/LibraryTransferContext";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const createBackupHqcc = jest.fn();

jest.mock("@/lib/backup", () => ({
  createBackupHqcc: (...args: unknown[]) => createBackupHqcc(...args),
  importBackupHqcc: jest.fn(),
  importBackupJson: jest.fn(),
}));

jest.mock("@/lib/tauri", () => ({
  openDownloadsFolderIfTauri: jest.fn(),
}));

function ExportHarness() {
  const { openExport } = useLibraryTransfer();

  return (
    <button type="button" onClick={openExport}>
      Open export
    </button>
  );
}

function renderHarness() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <LocalStorageProvider>
          <LibraryTransferProvider>
            <ExportHarness />
          </LibraryTransferProvider>
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
});
