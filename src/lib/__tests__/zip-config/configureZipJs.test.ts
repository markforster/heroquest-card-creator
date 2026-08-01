const configure = jest.fn();

jest.mock("@zip.js/zip.js", () => ({
  configure: (...args: unknown[]) => configure(...args),
}));

describe("configureZipJs", () => {
  beforeEach(() => {
    jest.resetModules();
    configure.mockReset();
    Object.defineProperty(document, "baseURI", {
      configurable: true,
      value: "https://example.test/app/",
    });
  });

  it("configures the non-worker fallback when workers are disabled", async () => {
    const { configureZipJs } = await import("@/lib/zip-config");

    configureZipJs(false);

    expect(configure).toHaveBeenCalledWith({
      workerURI: "https://example.test/app/zip/zip-web-worker.js",
      maxWorkers: 2,
      useWebWorkers: false,
    });
  });

  it("uses a worker after a successful preflight and avoids duplicate configuration", async () => {
    const terminate = jest.fn();
    const WorkerMock = jest.fn(() => ({ terminate }));
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: WorkerMock,
    });
    const { configureZipJs } = await import("@/lib/zip-config");

    configureZipJs(true);
    configureZipJs(true);

    expect(WorkerMock).toHaveBeenCalledWith("https://example.test/app/zip/zip-web-worker.js", {
      type: "module",
    });
    expect(terminate).toHaveBeenCalled();
    expect(configure).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledWith(expect.objectContaining({ useWebWorkers: true }));
  });

  it("falls back when worker construction fails", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: jest.fn(() => {
        throw new Error("blocked");
      }),
    });
    const { configureZipJs } = await import("@/lib/zip-config");

    configureZipJs(true);

    expect(configure).toHaveBeenCalledWith(expect.objectContaining({ useWebWorkers: false }));
  });
});
