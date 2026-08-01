jest.mock("@/api/client", () => ({
  apiClient: {
    exportLibrary: jest.fn(),
    importLibrary: jest.fn(),
  },
}));

import { apiClient } from "@/api/client";
import { exportLibrary, importLibrary } from "@/api/library/client";

describe("library client", () => {
  const mocks = jest.mocked(apiClient);

  beforeEach(() => {
    mocks.exportLibrary.mockReset().mockResolvedValue("export" as never);
    mocks.importLibrary.mockReset().mockResolvedValue("import" as never);
  });

  it("exports with no request options when none are supplied", async () => {
    await expect(exportLibrary()).resolves.toBe("export");
    expect(mocks.exportLibrary).toHaveBeenCalledWith();
  });

  it("forwards format and progress handlers in request metadata", async () => {
    const onProgress = jest.fn();
    await exportLibrary({ format: "compact-zip-v1", onProgress });
    expect(mocks.exportLibrary).toHaveBeenCalledWith({
      queries: { format: "compact-zip-v1" },
      hqcc: { format: "compact-zip-v1", onProgress },
    });
  });

  it("imports the file and optional progress handlers", async () => {
    const file = new File(["backup"], "library.hqcc");
    const onStatus = jest.fn();
    await expect(importLibrary(file, { onStatus })).resolves.toBe("import");
    expect(mocks.importLibrary).toHaveBeenCalledWith(
      { file, fileName: "library.hqcc" },
      { hqcc: { onStatus } },
    );
  });
});
