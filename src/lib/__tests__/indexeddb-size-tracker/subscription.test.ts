describe("DB estimate status subscriptions", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  it("publishes initial and cleared status and supports unsubscribe", async () => {
    const { clearDbEstimateCache, subscribeDbEstimateStatus } = await import(
      "@/lib/db/maintenance/indexeddb-size-tracker"
    );
    const listener = jest.fn();
    const unsubscribe = subscribeDbEstimateStatus(listener);

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ totalBytes: 0, processing: false, queueLength: 0 }),
    );
    clearDbEstimateCache();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    clearDbEstimateCache();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
