import { importBackupHqcc } from "@/lib/backup/backup-import";

describe("importBackupHqcc", () => {
  it("rejects files without a ZIP signature after reporting preparation", async () => {
    const onStatus = jest.fn();
    const file = {
      slice: () => ({ arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer }),
    } as unknown as File;

    await expect(importBackupHqcc(file, { onStatus })).rejects.toThrow("Unsupported backup format");
    expect(onStatus).toHaveBeenCalledWith("preparing");
  });
});
