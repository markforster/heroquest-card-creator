import type { ZodiosPlugin } from "@zodios/core";

const DATA_URL_PREFIX = "data:";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(DATA_URL_PREFIX) && value.includes(",");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read blob as data URL"));
    };

    reader.onload = () => {
      const { result } = reader;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result type"));
        return;
      }
      resolve(result);
    };

    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Invalid data URL: missing data: prefix");
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid data URL: missing comma separator");
  }

  const meta = dataUrl.slice(DATA_URL_PREFIX.length, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);

  const parts = meta.split(";");
  const mimeType = parts[0] || "application/octet-stream";
  const isBase64 = parts.includes("base64");

  let binaryString: string;
  try {
    if (isBase64) {
      binaryString = atob(payload);
    } else {
      binaryString = decodeURIComponent(payload);
    }
  } catch {
    throw new Error("Invalid data URL: failed to decode payload");
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

async function mapBlobsToDataUrls(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    return blobToDataUrl(value);
  }

  if (Array.isArray(value)) {
    const mapped = await Promise.all(value.map((entry) => mapBlobsToDataUrls(entry)));
    return mapped;
  }

  if (isPlainObject(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, entry]) => [key, await mapBlobsToDataUrls(entry)]),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

function mapDataUrlsToBlobs(value: unknown): unknown {
  if (isDataUrl(value)) {
    try {
      return dataUrlToBlob(value);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => mapDataUrlsToBlobs(entry));
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, entry]) => [key, mapDataUrlsToBlobs(entry)]);
    return Object.fromEntries(entries);
  }

  return value;
}

export const blobTransportPlugin: ZodiosPlugin = {
  name: "remote-blob-transport",
  request: async (_api, config) => {
    if (config.data === undefined) {
      return config;
    }

    const mapped = await mapBlobsToDataUrls(config.data);
    return {
      ...config,
      data: mapped,
    };
  },
  response: async (_api, _config, response) => {
    if (response?.data === undefined) return response;

    return {
      ...response,
      data: mapDataUrlsToBlobs(response.data),
    };
  },
};
