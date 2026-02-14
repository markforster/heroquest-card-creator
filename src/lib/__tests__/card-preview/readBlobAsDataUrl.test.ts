import { readBlobAsDataUrl } from "@/lib/card-preview";

class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(_blob: Blob) {
    this.result = "data:mock";
    this.onload?.();
  }
}

class MockFileReaderError {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(_blob: Blob) {
    this.onerror?.();
  }
}

describe("readBlobAsDataUrl", () => {
  const originalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it("resolves with data URL when FileReader succeeds", async () => {
    global.FileReader = MockFileReader as unknown as typeof FileReader;
    const blob = new Blob(["hello"], { type: "text/plain" });

    await expect(readBlobAsDataUrl(blob)).resolves.toBe("data:mock");
  });

  it("rejects with an error when FileReader fails", async () => {
    global.FileReader = MockFileReaderError as unknown as typeof FileReader;
    const blob = new Blob(["hello"], { type: "text/plain" });

    await expect(readBlobAsDataUrl(blob)).rejects.toThrow("Failed to read blob");
  });
});
