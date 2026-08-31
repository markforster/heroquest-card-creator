import {
  endExportLogging,
  logAssetInlineById,
  logAssetPrefetch,
  logCardFileName,
  logCardInfo,
  logCardRender,
  logCardSkip,
  logCardWait,
  logDeviceInfo,
  logSummary,
  startExportLogging,
} from "@/lib/export-logging";

describe("export logging", () => {
  const groupCollapsed = jest.spyOn(console, "groupCollapsed").mockImplementation(() => {});
  const groupEnd = jest.spyOn(console, "groupEnd").mockImplementation(() => {});
  const debug = jest.spyOn(console, "debug").mockImplementation(() => {});

  beforeEach(() => {
    groupCollapsed.mockClear();
    groupEnd.mockClear();
    debug.mockClear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("starts and ends a uniquely identified logging session", () => {
    jest.spyOn(Date, "now").mockReturnValue(1234);

    const first = startExportLogging({ mode: "single", totalCards: 1 });
    const second = startExportLogging({ mode: "bulk", totalCards: 2 });

    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first).toMatchObject({ startedAt: 1234, mode: "single", totalCards: 1 });
    expect(groupCollapsed).toHaveBeenCalledTimes(2);

    endExportLogging(first);
    endExportLogging(second);
    expect(groupEnd).toHaveBeenCalledTimes(2);
  });

  it("records card, asset, device, timing, and summary details for an active session", () => {
    const session = startExportLogging({ mode: "bulk", totalCards: 3 });

    logDeviceInfo(session);
    logCardInfo(session, {
      cardId: "card-1",
      title: "  ",
      templateId: "hero",
      face: "front",
      imageAsset: { id: "image-1", name: "Portrait" },
    });
    logCardWait(session, { durationMs: -2.4 });
    logCardRender(session, { durationMs: 4.6, success: true });
    logCardFileName(session, {
      cardId: "card-1",
      fileName: "hero.png",
      wasDeduped: false,
    });
    logCardSkip(session, { reason: "" });
    logAssetPrefetch(session, { total: 3, cached: 2, missing: 1 });
    logAssetInlineById(session.sessionId, {
      assetId: "image-1",
      source: "userAssetCache",
      durationMs: 1.6,
      outcome: "success",
    });
    logSummary(session, {
      endedAt: session.startedAt + 10,
      totalMs: 10.4,
      cards: 3,
      renders: 2,
      failures: 1,
    });

    expect(debug).toHaveBeenCalledWith(expect.stringContaining("Device:"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('title="Untitled"'));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("Wait: 0ms"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("Render: 5ms | success=true"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('name="hero.png"'));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("Skip: unknown"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("missing=1"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("Asset inline: id=image-1"));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining("failures=1"));

    endExportLogging(session);
  });

  it("ignores messages for missing or ended sessions", () => {
    logAssetInlineById(undefined, {
      assetId: "image-1",
      source: "embedded",
      durationMs: 1,
      outcome: "skipped",
    });
    logAssetInlineById("missing", {
      assetId: "image-1",
      source: "embedded",
      durationMs: 1,
      outcome: "skipped",
    });

    const session = startExportLogging({ mode: "single", totalCards: 1 });
    endExportLogging(session);
    debug.mockClear();
    logCardWait(session, { durationMs: 1 });

    expect(debug).not.toHaveBeenCalled();
  });
});
