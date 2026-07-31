const probeHqccDbVersion = jest.fn();
const readExistingHqccDbVersion = jest.fn();
const readExistingHqccDbAppVersion = jest.fn();

jest.mock("@/lib/db/hqcc-db", () => ({
  probeHqccDbVersion: () => probeHqccDbVersion(),
  readExistingHqccDbVersion: () => readExistingHqccDbVersion(),
  readExistingHqccDbAppVersion: () => readExistingHqccDbAppVersion(),
}));

import { checkDbVersionRequestPlugin } from "@/api/local/checkDbVersionRequest";

async function runAdapter() {
  const request = checkDbVersionRequestPlugin.request;
  if (!request) {
    throw new Error("Expected checkDbVersionRequestPlugin.request");
  }

  const resolved = await request([], {} as never);
  if (typeof resolved.adapter !== "function") {
    throw new Error("Expected checkDbVersionRequestPlugin to provide an adapter");
  }

  return resolved.adapter({} as never);
}

describe("checkDbVersionRequestPlugin", () => {
  beforeEach(() => {
    probeHqccDbVersion.mockReset();
    readExistingHqccDbVersion.mockReset();
    readExistingHqccDbAppVersion.mockReset();
  });

  it("returns ready when the native version probe succeeds", async () => {
    probeHqccDbVersion.mockResolvedValue(6);

    const response = await runAdapter();

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

    const response = await runAdapter();

    expect(readExistingHqccDbVersion).toHaveBeenCalledTimes(1);
    expect(readExistingHqccDbAppVersion).toHaveBeenCalledTimes(1);
    expect(response?.data).toEqual({
      status: "blocked",
      dbVersion: 5,
      dbAppVersion: "0.5.3",
    });
  });
});
