const probeHqccDbVersion = jest.fn();
const readExistingHqccDbVersion = jest.fn();
const readExistingHqccDbAppVersion = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  probeHqccDbVersion: () => probeHqccDbVersion(),
  readExistingHqccDbVersion: () => readExistingHqccDbVersion(),
  readExistingHqccDbAppVersion: () => readExistingHqccDbAppVersion(),
}));

import { checkDbVersionRequestPlugin } from "@/api/local/checkDbVersionRequest";

describe("checkDbVersionRequestPlugin", () => {
  beforeEach(() => {
    probeHqccDbVersion.mockReset();
    readExistingHqccDbVersion.mockReset();
    readExistingHqccDbAppVersion.mockReset();
  });

  it("returns ready when the native version probe succeeds", async () => {
    probeHqccDbVersion.mockResolvedValue(6);

    const resolved = await checkDbVersionRequestPlugin.request?.([], {} as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(probeHqccDbVersion).toHaveBeenCalledTimes(1);
    expect(response?.status).toBe(200);
    expect(response?.data).toEqual({
      status: "ready",
      dbVersion: 6,
      dbAppVersion: null,
    });
  });

  it("returns blocked with existing DB metadata when the probe hits VersionError", async () => {
    const error = Object.assign(new Error("blocked"), { name: "VersionError" });
    probeHqccDbVersion.mockRejectedValue(error);
    readExistingHqccDbVersion.mockResolvedValue(5);
    readExistingHqccDbAppVersion.mockResolvedValue("0.5.3");

    const resolved = await checkDbVersionRequestPlugin.request?.([], {} as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(readExistingHqccDbVersion).toHaveBeenCalledTimes(1);
    expect(readExistingHqccDbAppVersion).toHaveBeenCalledTimes(1);
    expect(response?.data).toEqual({
      status: "blocked",
      dbVersion: 5,
      dbAppVersion: "0.5.3",
    });
  });
});
