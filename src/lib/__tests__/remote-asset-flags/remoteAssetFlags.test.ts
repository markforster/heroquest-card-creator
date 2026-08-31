const readApiConfig = jest.fn();

jest.mock("@/api/config", () => ({
  readApiConfig: (...args: unknown[]) => readApiConfig(...args),
}));

import {
  getRemoteAssetHashIndexEnabled,
  getRemoteAssetThumbPrefetchEnabled,
  setRemoteAssetHashIndexEnabled,
  setRemoteAssetThumbPrefetchEnabled,
  subscribeRemoteAssetFlags,
} from "@/lib/remote-asset-flags";

describe("remote asset flags", () => {
  beforeEach(() => {
    readApiConfig.mockReset().mockReturnValue({ mode: "remote" });
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("keeps both optimizations enabled outside remote mode", () => {
    readApiConfig.mockReturnValue({ mode: "local" });

    expect(getRemoteAssetThumbPrefetchEnabled()).toBe(true);
    expect(getRemoteAssetHashIndexEnabled()).toBe(true);
  });

  it("defaults both optimizations off in remote mode", () => {
    expect(getRemoteAssetThumbPrefetchEnabled()).toBe(false);
    expect(getRemoteAssetHashIndexEnabled()).toBe(false);
  });

  it.each([
    ["1", true],
    ["true", true],
    ["0", false],
    ["false", false],
    ["invalid", false],
  ])("parses stored remote flag value %s", (stored, expected) => {
    window.localStorage.setItem("hqcc.remote.assetThumbPrefetchEnabled", stored);

    expect(getRemoteAssetThumbPrefetchEnabled()).toBe(expected);
  });

  it("persists changes and notifies subscribers", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRemoteAssetFlags(listener);

    setRemoteAssetThumbPrefetchEnabled(true);
    setRemoteAssetHashIndexEnabled(false);

    expect(window.localStorage.getItem("hqcc.remote.assetThumbPrefetchEnabled")).toBe("1");
    expect(window.localStorage.getItem("hqcc.remote.assetHashIndexEnabled")).toBe("0");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setRemoteAssetHashIndexEnabled(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("uses safe defaults when configuration or storage access fails", () => {
    readApiConfig.mockImplementation(() => {
      throw new Error("invalid configuration");
    });
    expect(getRemoteAssetThumbPrefetchEnabled()).toBe(true);

    readApiConfig.mockReturnValue({ mode: "remote" });
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(getRemoteAssetHashIndexEnabled()).toBe(false);
  });

  it("tolerates storage failures while changing a flag", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => setRemoteAssetThumbPrefetchEnabled(true)).not.toThrow();
  });
});
