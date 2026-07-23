import { checkHelpSiteAvailability } from "../../help-site-availability";

describe("checkHelpSiteAvailability", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true for a successful response", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    await expect(checkHelpSiteAvailability({ fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://markforster.github.io/heroquest-card-creator/help/",
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
