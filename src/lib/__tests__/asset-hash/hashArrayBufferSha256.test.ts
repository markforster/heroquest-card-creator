import { hashArrayBufferSha256 } from "@/lib/asset-hash";
import { TextEncoder } from "util";

function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

describe("hashArrayBufferSha256", () => {
  const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  afterEach(() => {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).crypto;
    }
  });

  it("uses crypto.subtle when available", async () => {
    const expected =
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"; // sha256("abc")
    const digest = hexToArrayBuffer(expected);

    const digestMock = jest.fn(async () => digest);
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { subtle: { digest: digestMock } },
    });

    const buffer = new TextEncoder().encode("abc").buffer;
    await expect(hashArrayBufferSha256(buffer)).resolves.toBe(expected);
    expect(digestMock).toHaveBeenCalledWith("SHA-256", buffer);
  });

  it("hashes empty buffer (fallback path)", async () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} });
    const empty = new Uint8Array([]).buffer;
    await expect(hashArrayBufferSha256(empty)).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("falls back when crypto.subtle is missing", async () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} });

    const buffer = new TextEncoder().encode("abc").buffer;
    await expect(hashArrayBufferSha256(buffer)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
