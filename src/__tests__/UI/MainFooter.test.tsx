import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import MainFooter from "@/components/MainFooter";
import { I18nProvider } from "@/i18n/I18nProvider";
import { createBackupHqcc } from "@/lib/backup";

jest.mock("@/version", () => ({
  APP_VERSION: "0.0.0-test",
}));

jest.mock("@/lib/backup", () => ({
  createBackupHqcc: jest.fn(),
  importBackupHqcc: jest.fn(),
  importBackupJson: jest.fn(),
}));

jest.mock("@/components/HelpModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/ReleaseNotesModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/BackupProgressOverlay", () => ({
  __esModule: true,
  default: () => null,
}));

function renderMainFooter() {
  return render(
    <I18nProvider>
      <MainFooter />
    </I18nProvider>,
  );
}

function ensureUrlObjectUrlMocks() {
  const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

  if (typeof URL.createObjectURL !== "function") {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn() });
  }
  if (typeof URL.revokeObjectURL !== "function") {
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  }

  return () => {
    if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else delete (URL as any).createObjectURL;

    if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else delete (URL as any).revokeObjectURL;
  };
}

describe("MainFooter (UI)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (window.alert as jest.Mock).mockRestore?.();
  });

  it("shows the app version", () => {
    renderMainFooter();
    expect(screen.getByText("v0.0.0-test")).toBeInTheDocument();
  });

  it("opens import confirm modal and triggers file input click on confirm", () => {
    const inputClick = jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    renderMainFooter();

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    const heading = screen.getByRole("heading", { name: "Import data" });
    const modalHeader = heading.closest(".modal-header");
    expect(modalHeader).not.toBeNull();

    const modalPanel = modalHeader!.parentElement as HTMLElement;
    const modalFooter = modalPanel.querySelector(".modal-footer") as HTMLElement | null;
    expect(modalFooter).not.toBeNull();

    fireEvent.click(within(modalFooter!).getByRole("button", { name: "Import" }));
    expect(inputClick).toHaveBeenCalledTimes(1);

    inputClick.mockRestore();
  });

  it("calls createBackupHqcc and generates a download on export", async () => {
    const restoreUrlMocks = ensureUrlObjectUrlMocks();
    const createObjectUrl = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    const revokeObjectUrl = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const linkClick = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    (createBackupHqcc as jest.Mock).mockResolvedValueOnce({
      blob: new Blob(["test"], { type: "application/zip" }),
      fileName: "backup.hqcc",
      meta: { cardsCount: 0, assetsCount: 0, collectionsCount: 0 },
    });

    renderMainFooter();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => expect(createBackupHqcc).toHaveBeenCalledTimes(1));
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(linkClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:download");

    linkClick.mockRestore();
    revokeObjectUrl.mockRestore();
    createObjectUrl.mockRestore();
    restoreUrlMocks();
  });
});
