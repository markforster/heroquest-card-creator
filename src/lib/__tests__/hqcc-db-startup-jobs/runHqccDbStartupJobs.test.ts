const dedupePairsFromStore = jest.fn();
const backfillPairsFromLegacy = jest.fn();
const cleanupLegacyPairedWith = jest.fn();
const migrateCardCanvas = jest.fn();

jest.mock("@/lib/hqcc-db-pair-jobs", () => ({
  dedupePairsFromStore: (...args: unknown[]) => dedupePairsFromStore(...args),
  backfillPairsFromLegacy: (...args: unknown[]) => backfillPairsFromLegacy(...args),
  cleanupLegacyPairedWith: (...args: unknown[]) => cleanupLegacyPairedWith(...args),
}));

jest.mock("@/lib/hqcc-db-card-canvas-job", () => ({
  migrateCardCanvas: (...args: unknown[]) => migrateCardCanvas(...args),
}));

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("runHqccDbStartupJobs", () => {
  beforeEach(() => {
    jest.resetModules();
    dedupePairsFromStore.mockReset();
    backfillPairsFromLegacy.mockReset();
    cleanupLegacyPairedWith.mockReset();
    migrateCardCanvas.mockReset();
  });

  it("runs pair jobs in sequence and launches card canvas migration independently", async () => {
    const order: string[] = [];
    const dedupe = createDeferred<void>();
    const backfill = createDeferred<void>();
    const cleanup = createDeferred<void>();
    const canvas = createDeferred<void>();

    dedupePairsFromStore.mockImplementation(() => {
      order.push("dedupe:start");
      return dedupe.promise.then(() => {
        order.push("dedupe:done");
      });
    });
    backfillPairsFromLegacy.mockImplementation(() => {
      order.push("backfill:start");
      return backfill.promise.then(() => {
        order.push("backfill:done");
      });
    });
    cleanupLegacyPairedWith.mockImplementation(() => {
      order.push("cleanup:start");
      return cleanup.promise.then(() => {
        order.push("cleanup:done");
      });
    });
    migrateCardCanvas.mockImplementation(() => {
      order.push("canvas:start");
      return canvas.promise.then(() => {
        order.push("canvas:done");
      });
    });

    const { runHqccDbStartupJobs } = await import("@/lib/hqcc-db-startup-jobs");
    runHqccDbStartupJobs();

    expect(order).toEqual(["dedupe:start", "canvas:start"]);
    expect(backfillPairsFromLegacy).not.toHaveBeenCalled();
    expect(cleanupLegacyPairedWith).not.toHaveBeenCalled();

    dedupe.resolve();
    await flushMicrotasks();
    expect(order).toEqual(["dedupe:start", "canvas:start", "dedupe:done", "backfill:start"]);

    backfill.resolve();
    await flushMicrotasks();
    expect(order).toEqual([
      "dedupe:start",
      "canvas:start",
      "dedupe:done",
      "backfill:start",
      "backfill:done",
      "cleanup:start",
    ]);

    cleanup.resolve();
    canvas.resolve();
    await flushMicrotasks();

    expect(order).toEqual([
      "dedupe:start",
      "canvas:start",
      "dedupe:done",
      "backfill:start",
      "backfill:done",
      "cleanup:start",
      "cleanup:done",
      "canvas:done",
    ]);
  });

  it("does not start duplicate in-flight branches on repeated calls", async () => {
    const dedupe = createDeferred<void>();
    const canvas = createDeferred<void>();

    dedupePairsFromStore.mockImplementation(() => dedupe.promise);
    backfillPairsFromLegacy.mockResolvedValue(undefined);
    cleanupLegacyPairedWith.mockResolvedValue(undefined);
    migrateCardCanvas.mockImplementation(() => canvas.promise);

    const { runHqccDbStartupJobs } = await import("@/lib/hqcc-db-startup-jobs");
    runHqccDbStartupJobs();
    runHqccDbStartupJobs();

    expect(dedupePairsFromStore).toHaveBeenCalledTimes(1);
    expect(migrateCardCanvas).toHaveBeenCalledTimes(1);

    dedupe.resolve();
    canvas.resolve();
    await flushMicrotasks();

    runHqccDbStartupJobs();

    expect(dedupePairsFromStore).toHaveBeenCalledTimes(2);
    expect(migrateCardCanvas).toHaveBeenCalledTimes(2);
  });
});
