import {
  checkHelpSiteAvailability,
  DEFAULT_HELP_SITE_URL,
  resolveHelpSiteUrl,
} from "../../help-site-availability";

describe("resolveHelpSiteUrl", () => {
  it("uses the deployed help centre by default", () => {
    expect(resolveHelpSiteUrl(undefined)).toBe(DEFAULT_HELP_SITE_URL);
  });

  it("uses and trims a configured help centre URL", () => {
    expect(resolveHelpSiteUrl("  http://127.0.0.1:8001/help/  ")).toBe(
      "http://127.0.0.1:8001/help/",
    );
  });
});

describe("checkHelpSiteAvailability", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true for a successful response", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    await expect(checkHelpSiteAvailability({ fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      DEFAULT_HELP_SITE_URL,
      expect.objectContaining({
        cache: "no-store",
        method: "HEAD",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("returns false for an unsuccessful response", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(checkHelpSiteAvailability({ fetchImpl })).resolves.toBe(false);
  });

  it("accepts an opaque response from a loopback help server", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: false, type: "opaque" }) as unknown as typeof fetch;
    const url = "http://127.0.0.1:8001/heroquest-card-creator/help/";

    await expect(checkHelpSiteAvailability({ fetchImpl, url })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        cache: "no-store",
        method: "HEAD",
        mode: "no-cors",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("returns false when the request rejects", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;

    await expect(checkHelpSiteAvailability({ fetchImpl })).resolves.toBe(false);
  });

  it("aborts a request that exceeds the timeout", async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    ) as unknown as typeof fetch;

    const result = checkHelpSiteAvailability({ fetchImpl, timeoutMs: 100 });
    jest.advanceTimersByTime(100);

    await expect(result).resolves.toBe(false);
  });
});
