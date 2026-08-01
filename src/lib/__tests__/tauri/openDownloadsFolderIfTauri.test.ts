const isTauri = jest.fn();
const downloadDir = jest.fn();
const openPath = jest.fn();

jest.mock("@tauri-apps/api/core", () => ({ isTauri: (...args: unknown[]) => isTauri(...args) }));
jest.mock("@tauri-apps/api/path", () => ({
  downloadDir: (...args: unknown[]) => downloadDir(...args),
}));
jest.mock("@tauri-apps/plugin-opener", () => ({
  openPath: (...args: unknown[]) => openPath(...args),
}));

import { openDownloadsFolderIfTauri } from "@/lib/tauri";

describe("openDownloadsFolderIfTauri", () => {
  beforeEach(() => {
    isTauri.mockReset();
    downloadDir.mockReset();
    openPath.mockReset();
  });

  it("does nothing outside Tauri", async () => {
    isTauri.mockReturnValue(false);
    await openDownloadsFolderIfTauri();
    expect(downloadDir).not.toHaveBeenCalled();
  });

  it("opens the detected downloads directory in Tauri", async () => {
    isTauri.mockResolvedValue(true);
    downloadDir.mockResolvedValue("/downloads");
    await openDownloadsFolderIfTauri();
    expect(openPath).toHaveBeenCalledWith("/downloads");
  });

  it("tolerates missing paths and API failures", async () => {
    isTauri.mockReturnValue(true);
    downloadDir.mockResolvedValueOnce("").mockRejectedValueOnce(new Error("unavailable"));
    await expect(openDownloadsFolderIfTauri()).resolves.toBeUndefined();
    await expect(openDownloadsFolderIfTauri()).resolves.toBeUndefined();
    expect(openPath).not.toHaveBeenCalled();
  });
});
