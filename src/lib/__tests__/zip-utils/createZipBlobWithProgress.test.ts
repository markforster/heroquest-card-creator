const mockAdd = jest.fn();
const mockClose = jest.fn();

jest.mock("@/lib/zip-config", () => ({
  configureZipJs: jest.fn(),
}));

jest.mock("@zip.js/zip.js", () => ({
  BlobReader: jest.fn(),
  BlobWriter: jest.fn(),
  TextReader: jest.fn(),
  ZipWriter: jest.fn(),
}));

import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";

import { configureZipJs } from "@/lib/zip-config";
import { createZipBlobWithProgress } from "@/lib/zip-utils";

const mockConfigureZipJs = jest.mocked(configureZipJs);
const mockZipWriter = jest.mocked(ZipWriter);
const mockBlobWriter = jest.mocked(BlobWriter);
const mockBlobReader = jest.mocked(BlobReader);
const mockTextReader = jest.mocked(TextReader);

describe("createZipBlobWithProgress", () => {
  beforeEach(() => {
    mockConfigureZipJs.mockReset();
    mockAdd.mockReset();
    mockClose.mockReset();
    mockZipWriter.mockClear();
    mockBlobWriter.mockClear();
    mockBlobReader.mockClear();
    mockTextReader.mockClear();
    mockZipWriter.mockImplementation(
      () =>
        ({
          add: mockAdd,
          close: mockClose,
        }) as unknown as InstanceType<typeof ZipWriter>,
    );
    mockBlobWriter.mockImplementation((type?: string) => ({ type }) as never);
    mockBlobReader.mockImplementation((data: Blob) => ({ data }) as never);
    mockTextReader.mockImplementation((data: string) => ({ data }) as never);
  });

  it("creates a compressed archive with monotonic progress", async () => {
    const output = new Blob(["zip"], { type: "application/zip" });
    mockAdd.mockImplementation(
      async (
        _name: string,
        reader: { data: Blob | string },
        options: { onprogress: (loaded: number) => Promise<void> },
      ) => {
        const size = typeof reader.data === "string" ? reader.data.length : reader.data.size;
        await options.onprogress(size);
      },
    );
    mockClose.mockImplementation(
      async (
        _comment: undefined,
        options: { onprogress: (progress: number, total: number) => Promise<void> },
      ) => {
        await options.onprogress(1, 2);
        return output;
      },
    );
    const onProgress = jest.fn();
    const onStatus = jest.fn();

    await expect(
      createZipBlobWithProgress({
        files: [
          { name: "notes.txt", data: "abc" },
          { name: "card.png", data: new Blob(["12345"]) },
        ],
        compress: true,
        onProgress,
        onStatus,
      }),
    ).resolves.toBe(output);

    expect(mockConfigureZipJs).toHaveBeenCalledWith(true);
    expect(onStatus).toHaveBeenCalledWith("worker");
    expect(mockZipWriter).toHaveBeenCalledWith(expect.anything(), { level: 6 });
    expect(mockTextReader).toHaveBeenCalledWith("abc");
    expect(mockBlobReader).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(0);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("retries without workers when worker-backed ZIP creation fails", async () => {
    const output = new Blob(["zip"]);
    mockAdd.mockRejectedValueOnce(new Error("worker unavailable"));
    mockClose.mockResolvedValue(output);
    const onStatus = jest.fn();

    await expect(
      createZipBlobWithProgress({
        files: [{ name: "notes.txt", data: "abc" }],
        compress: false,
        onStatus,
      }),
    ).resolves.toBe(output);

    expect(mockConfigureZipJs.mock.calls).toEqual([[true], [false]]);
    expect(onStatus.mock.calls).toEqual([["worker"], ["fallback"]]);
    expect(mockZipWriter).toHaveBeenLastCalledWith(expect.anything(), { level: 0 });
  });

  it("reports zero progress for an empty archive", async () => {
    const output = new Blob(["zip"]);
    mockClose.mockResolvedValue(output);
    const onProgress = jest.fn();

    await createZipBlobWithProgress({ files: [], compress: false, onProgress });

    expect(onProgress).toHaveBeenNthCalledWith(1, 0);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });
});
