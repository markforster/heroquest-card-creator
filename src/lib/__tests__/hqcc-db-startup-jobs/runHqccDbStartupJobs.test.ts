const dedupePairsFromStore = jest.fn();
const migrateCardCanvas = jest.fn();

jest.mock("@/lib/hqcc-db-pair-jobs", () => ({
  dedupePairsFromStore: (...args: unknown[]) => dedupePairsFromStore(...args),
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
    migrateCardCanvas.mockReset();
  });

  it("runs pair dedupe and launches card canvas migration independently", async () => {
    const order: string[] = [];
    const dedupe = createDeferred<void>();
    const canvas = createDeferred<void>();

    dedupePairsFromStore.mockImplementation(() => {
      order.push("dedupe:start");
      return dedupe.promise.then(() => {
        order.push("dedupe:done");
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

    dedupe.resolve();
    await flushMicrotasks();
    expect(order).toEqual(["dedupe:start", "canvas:start", "dedupe:done"]);

    canvas.resolve();
    await flushMicrotasks();

    expect(order).toEqual(["dedupe:start", "canvas:start", "dedupe:done", "canvas:done"]);
  });

  it("does not start duplicate in-flight branches on repeated calls", async () => {
    const dedupe = createDeferred<void>();
    const canvas = createDeferred<void>();

    dedupePairsFromStore.mockImplementation(() => dedupe.promise);
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
