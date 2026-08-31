const readApiConfig = jest.fn();

jest.mock("@/api/config", () => ({
  readApiConfig: (...args: unknown[]) => readApiConfig(...args),
}));

import {
  getAssetAutoClassifyEnabled,
  setAssetAutoClassifyEnabled,
} from "@/lib/asset-auto-classify";

describe("asset auto classification setting", () => {
  beforeEach(() => {
    window.localStorage.clear();
    readApiConfig.mockReset().mockReturnValue({ mode: "local" });
    jest.restoreAllMocks();
  });

  it("honors stored enabled and disabled values", () => {
    window.localStorage.setItem("hqcc.assetAutoClassifyEnabled", "0");
    expect(getAssetAutoClassifyEnabled()).toBe(false);
    window.localStorage.setItem("hqcc.assetAutoClassifyEnabled", "true");
    expect(getAssetAutoClassifyEnabled()).toBe(true);
  });

  it("defaults off remotely and on locally", () => {
    readApiConfig.mockReturnValue({ mode: "remote" });
    expect(getAssetAutoClassifyEnabled()).toBe(false);
    readApiConfig.mockReturnValue({ mode: "local" });
    expect(getAssetAutoClassifyEnabled()).toBe(true);
  });

  it("persists changes and tolerates storage failures", () => {
    setAssetAutoClassifyEnabled(false);
    expect(window.localStorage.getItem("hqcc.assetAutoClassifyEnabled")).toBe("0");
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(() => setAssetAutoClassifyEnabled(true)).not.toThrow();
  });
});
