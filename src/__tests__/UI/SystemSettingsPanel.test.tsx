import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SystemSettingsPanel from "@/components/Modals/SettingsModal/SystemSettingsPanel";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LANGUAGE_STORAGE_KEY } from "@/i18n/getInitialLanguage";

jest.mock("@/version", () => ({
  APP_VERSION: "0.0.0-test",
}));

const getDbEstimateStatus = jest.fn();
const runFullDbEstimate = jest.fn();
const subscribeDbEstimateStatus = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  getDbEstimateStatus: () => getDbEstimateStatus(),
  runFullDbEstimate: () => runFullDbEstimate(),
  subscribeDbEstimateStatus: (listener: (status: unknown) => void) => subscribeDbEstimateStatus(listener),
}));

type StorageEstimate = {
  usage?: number;
  quota?: number;
};

const estimateMock = jest.fn<Promise<StorageEstimate>, []>();

function renderPanel() {
  return render(
    <I18nProvider>
      <SystemSettingsPanel />
    </I18nProvider>,
  );
}

describe("SystemSettingsPanel (UI)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    getDbEstimateStatus.mockReturnValue({
      totalBytes: 0,
      recordsScanned: 0,
      byStore: {},
      lastUpdated: null,
      processing: false,
      queueLength: 0,
    });
    runFullDbEstimate.mockResolvedValue(undefined);
    subscribeDbEstimateStatus.mockImplementation(() => () => undefined);
    estimateMock.mockResolvedValue({
      usage: 1024,
      quota: 4096,
    });

    Object.defineProperty(global.navigator, "storage", {
      configurable: true,
      value: {
        estimate: estimateMock,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the existing storage summary without a chart before calculation", async () => {
    renderPanel();

    expect(await screen.findByText(/Estimated total browser app usage:/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated total browser app usage")).toBeInTheDocument();
    expect(screen.getByText("Other browser/app storage: 1.0 KB")).toBeInTheDocument();
    expect(screen.queryByText("Assets: 0 B")).not.toBeInTheDocument();
    expect(screen.queryByText(/Estimated library size: Not yet calculated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Records scanned:/i)).not.toBeInTheDocument();
  });

  it("renders a single combined top summary and a rest-only ranked breakdown", async () => {
    estimateMock.mockResolvedValue({
      usage: 20480,
      quota: 40960,
    });
    getDbEstimateStatus.mockReturnValue({
      totalBytes: 9728,
      recordsScanned: 9,
      byStore: {
        assets: { bytes: 6144, records: 3 },
        cards: { bytes: 3072, records: 5 },
        pairs: { bytes: 128, records: 4 },
        settings: { bytes: 0, records: 1 },
        collections: { bytes: 512, records: 1 },
        meta: { bytes: 32, records: 1 },
      },
      lastUpdated: "13/03/2026, 11:00:00",
      processing: false,
      queueLength: 0,
    });

    renderPanel();

    await screen.findByLabelText("Estimated total browser app usage");
    expect(screen.queryByText("Assets, cards, and everything else")).not.toBeInTheDocument();
    expect(screen.queryByText("Assets vs everything else")).not.toBeInTheDocument();
    expect(screen.queryByText("Cards vs other small stores")).not.toBeInTheDocument();
    expect(screen.getByText("Everything else breakdown")).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated total browser app usage")).toBeInTheDocument();
    expect(screen.getByText("Assets: 6.0 KB (3 records)")).toBeInTheDocument();
    expect(screen.getByText("Cards: 3.0 KB (5 records)")).toBeInTheDocument();
    expect(screen.getByText("Everything else: 672 B (6 records)")).toBeInTheDocument();
    expect(screen.getByText("Other browser/app storage: 10.3 KB")).toBeInTheDocument();
    expect(screen.queryByText(/Estimated library size:/i)).not.toBeInTheDocument();
    expect(screen.getByText("51.7%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText("15.0%")).toBeInTheDocument();
    expect(screen.getByText("3.3%")).toBeInTheDocument();
    expect(screen.getByText("Collections: 512 B (1 records)")).toBeInTheDocument();
    expect(screen.getByText("Pairs: 128 B (4 records)")).toBeInTheDocument();
    expect(screen.getByText("Meta: 32 B (1 records)")).toBeInTheDocument();
    expect(screen.queryByText("Other small stores: 672 B (6 records)")).not.toBeInTheDocument();
  });

  it("renders translated store labels and community copy in a non-English language", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "de");
    estimateMock.mockResolvedValue({
      usage: 20480,
      quota: 40960,
    });
    getDbEstimateStatus.mockReturnValue({
      totalBytes: 9728,
      recordsScanned: 9,
      byStore: {
        assets: { bytes: 6144, records: 3 },
        cards: { bytes: 3072, records: 5 },
        pairs: { bytes: 128, records: 4 },
        collections: { bytes: 512, records: 1 },
        meta: { bytes: 32, records: 1 },
      },
      lastUpdated: "13/03/2026, 11:00:00",
      processing: false,
      queueLength: 0,
    });

    renderPanel();

    expect(await screen.findByText("Anderer Browser-/App-Speicher: 10.3 KB")).toBeInTheDocument();
    expect(screen.getByText("Ressourcen: 6.0 KB (3 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Karten: 3.0 KB (5 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Alles andere: 672 B (6 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Sammlungen: 512 B (1 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Paare: 128 B (4 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Metadaten: 32 B (1 Einträge)")).toBeInTheDocument();
    expect(screen.getByText("Auf itch.io melden")).toBeInTheDocument();
    expect(screen.queryByText("Assets: 6.0 KB (3 records)")).not.toBeInTheDocument();
    expect(screen.queryByText("Everything else breakdown")).not.toBeInTheDocument();
  });

  it("refreshes the estimate and updates the button loading state", async () => {
    runFullDbEstimate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }),
    );

    renderPanel();

    const button = await screen.findByRole("button", { name: "Refresh browser storage estimate" });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled();

    await waitFor(() => {
      expect(runFullDbEstimate).toHaveBeenCalledTimes(1);
      expect(estimateMock).toHaveBeenCalledTimes(2);
      expect(
        screen.getByRole("button", { name: "Refresh browser storage estimate" }),
      ).toBeEnabled();
    });
  });
});
