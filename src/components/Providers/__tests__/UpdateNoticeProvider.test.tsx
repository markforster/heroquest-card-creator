import { act, render, screen, waitFor } from "@testing-library/react";

import {
  UpdateNoticeProvider,
  useUpdateNotice,
} from "@/components/Providers/UpdateNoticeProvider";
import { UPDATE_CHECK_INTERVAL_MS, UPDATE_STORAGE_KEYS } from "@/lib/update-check/constants";

let mockAppVersion = "0.5.0";

jest.mock("@/version", () => ({
  get APP_VERSION() {
    return mockAppVersion;
  },
}));

const originalFetch = global.fetch;

function TestConsumer() {
  const { distribution, isOnline, isChecking, isUpdateAvailable, latestVersion, source, error } =
    useUpdateNotice();

  return (
    <div>
      <span data-testid="distribution">{distribution}</span>
      <span data-testid="is-online">{String(isOnline)}</span>
      <span data-testid="is-checking">{String(isChecking)}</span>
      <span data-testid="is-update-available">{String(isUpdateAvailable)}</span>
      <span data-testid="latest-version">{latestVersion ?? "none"}</span>
      <span data-testid="source">{source ?? "none"}</span>
      <span data-testid="error">{error ?? "none"}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <UpdateNoticeProvider>
      <TestConsumer />
    </UpdateNoticeProvider>,
  );
}

describe("UpdateNoticeProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAppVersion = "0.5.0";
    global.fetch = jest.fn() as unknown as typeof fetch;
    window.localStorage.clear();
    delete process.env.NEXT_PUBLIC_APP_DISTRIBUTION;
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("checks GitHub latest release for download builds only", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("is-update-available")).toHaveTextContent("true");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/markforster/heroquest-card-creator/releases/latest",
      { cache: "no-store" },
    );
    expect(screen.getByTestId("distribution")).toHaveTextContent("download");
    expect(screen.getByTestId("is-online")).toHaveTextContent("true");
    expect(screen.getByTestId("is-update-available")).toHaveTextContent("true");
    expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    expect(screen.getByTestId("source")).toHaveTextContent("github");
  });

  it("checks the npm registry for npm builds only", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "npm";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "0.6.0" } }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("source")).toHaveTextContent("npm");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://registry.npmjs.org/%40markforster%2Fheroquest-card-creator",
      { cache: "no-store" },
    );
    expect(screen.getByTestId("distribution")).toHaveTextContent("npm");
    expect(screen.getByTestId("source")).toHaveTextContent("npm");
  });

  it("does not perform an update check for itch builds", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "itch";

    renderWithProvider();

    await act(async () => {});

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("distribution")).toHaveTextContent("itch");
    expect(screen.getByTestId("is-online")).toHaveTextContent("true");
    expect(screen.getByTestId("is-update-available")).toHaveTextContent("false");
  });

  it("does not perform an update check when mounted offline", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    renderWithProvider();

    await act(async () => {});

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("is-online")).toHaveTextContent("false");
  });

  it("preserves a confirmed stored update when mounted offline", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");

    renderWithProvider();

    await act(async () => {});

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("is-online")).toHaveTextContent("false");
    expect(screen.getByTestId("is-update-available")).toHaveTextContent("true");
    expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    expect(screen.getByTestId("source")).toHaveTextContent("github");
  });

  it("clears a stale stored update when the stored remote version equals the current app version", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    mockAppVersion = "0.6.0";
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderWithProvider();

    expect(screen.getByTestId("is-update-available")).toHaveTextContent("false");
    expect(screen.getByTestId("latest-version")).toHaveTextContent("none");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.available)).toBe("0");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion)).toBeNull();
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.source)).toBeNull();
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt)).toBe("12345");
  });

  it("clears a stale stored update when the current app version is newer than the stored remote version", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    mockAppVersion = "0.6.0";
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.5.9");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");

    renderWithProvider();

    await act(async () => {});

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("is-update-available")).toHaveTextContent("false");
    expect(screen.getByTestId("latest-version")).toHaveTextContent("none");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.available)).toBe("0");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion)).toBeNull();
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.source)).toBeNull();
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt)).toBe("12345");
  });

  it("always performs a fresh check on mount even when a stored success exists", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, String(Date.now() - 1000));
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.5.1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves the last successful stored result when a check fails", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");

    (global.fetch as jest.Mock).mockRejectedValue(new Error("offline"));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("offline");
    });

    expect(screen.getByTestId("is-update-available")).toHaveTextContent("true");
    expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt)).toBe("12345");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion)).toBe("0.6.0");
  });

  it("updates isOnline and preserves stored state when an offline event fires", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    });

    const lastSuccessfulCheckAt = window.localStorage.getItem(
      UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt,
    );

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("is-online")).toHaveTextContent("false");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt)).toBe(
      lastSuccessfulCheckAt,
    );
  });

  it("writes successful results to localStorage", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    });

    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.distribution)).toBe("download");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion)).toBe("0.6.0");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.available)).toBe("1");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.source)).toBe("github");
  });

  it("replaces a previously known update version when a newer remote version is confirmed", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, "12345");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.7.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("latest-version")).toHaveTextContent("0.7.0");
    });

    expect(screen.getByTestId("is-update-available")).toHaveTextContent("true");
    expect(window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion)).toBe("0.7.0");
  });

  it("schedules the next automatic check 24 hours after a successful check", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("latest-version")).toHaveTextContent("0.6.0");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("runs a check immediately when the browser comes online after an offline mount", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    expect(global.fetch).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not run another check immediately on reconnect if a successful check happened less than 24 hours ago", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    const recentSuccess = Date.now() - 60 * 1000;
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, String(recentSuccess));
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("runs a check immediately on reconnect when the last successful check is overdue", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    const overdueSuccess = Date.now() - UPDATE_CHECK_INTERVAL_MS - 1000;
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, "download");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, String(overdueSuccess));
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, "0.6.0");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, "1");
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, "github");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    window.localStorage.setItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt, String(overdueSuccess));

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("does not fetch when the scheduled 24-hour timer becomes due while offline, then fetches on reconnect", async () => {
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    } as Response);

    renderWithProvider();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
      jest.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
