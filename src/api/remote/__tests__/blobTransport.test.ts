import { blobTransportPlugin } from "@/api/remote/blobTransport";

import type { AnyZodiosRequestOptions, ZodiosEndpointDefinitions } from "@zodios/core";
import type { AxiosResponse } from "axios";

const api: ZodiosEndpointDefinitions = [];

function requestConfig(data?: unknown): AnyZodiosRequestOptions {
  return { method: "post", url: "/test", data } as AnyZodiosRequestOptions;
}

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe("blobTransportPlugin", () => {
  it("leaves request and response objects without data unchanged", async () => {
    const request = requestConfig();
    const response = { status: 204 } as AxiosResponse;

    await expect(blobTransportPlugin.request?.(api, request)).resolves.toBe(request);
    await expect(blobTransportPlugin.response?.(api, request, response)).resolves.toBe(response);
  });

  it("converts nested request blobs to data URLs without changing other values", async () => {
    const request = requestConfig({
      name: "asset",
      nested: [new Blob(["hello"], { type: "text/plain" }), 42],
    });

    const result = await blobTransportPlugin.request?.(api, request);

    expect(result?.data).toEqual({
      name: "asset",
      nested: ["data:text/plain;base64,aGVsbG8=", 42],
    });
  });

  it("converts base64 and encoded response data URLs to blobs", async () => {
    const request = requestConfig();
    const response = {
      data: {
        binary: "data:text/plain;base64,aGVsbG8=",
        encoded: "data:text/plain,hello%20world",
      },
    } as AxiosResponse;

    const result = await blobTransportPlugin.response?.(api, request, response);
    const data = result?.data as { binary: Blob; encoded: Blob };

    expect(data.binary).toBeInstanceOf(Blob);
    expect(data.binary.type).toBe("text/plain");
    await expect(readBlob(data.binary)).resolves.toBe("hello");
    await expect(readBlob(data.encoded)).resolves.toBe("hello world");
  });

  it("preserves malformed data URLs and ordinary object-like values", async () => {
    const request = requestConfig();
    const malformed = "data:text/plain,%E0%A4%A";
    const response = {
      data: [malformed, new Date(0), null],
    } as AxiosResponse;

    const result = await blobTransportPlugin.response?.(api, request, response);

    expect(result?.data).toEqual([malformed, new Date(0), null]);
  });
});
