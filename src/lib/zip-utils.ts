"use client";

import {
  BlobReader,
  BlobWriter,
  TextReader,
  ZipWriter,
} from "@zip.js/zip.js";

import { configureZipJs } from "@/lib/zip-config";

import type { ZipWriterCloseOptions } from "@zip.js/zip.js";


type ZipFileEntry = {
  name: string;
  data: Blob | string;
};

type ZipProgressMode = "worker" | "fallback";

type CreateZipWithProgressParams = {
  files: ZipFileEntry[];
  compress: boolean;
  onProgress?: (percent: number) => void;
  onStatus?: (mode: ZipProgressMode) => void;
};

const getByteLength = (value: string) => {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
};

const createZipBlob = async (
  params: CreateZipWithProgressParams,
  useWebWorkers: boolean,
): Promise<Blob> => {
  configureZipJs(useWebWorkers);
  params.onStatus?.(useWebWorkers ? "worker" : "fallback");

  const { files, compress, onProgress } = params;
  const totalBytes = files.reduce((sum, file) => {
    if (typeof file.data === "string") {
      return sum + getByteLength(file.data);
    }
    return sum + file.data.size;
  }, 0);

  let completedBytes = 0;
  let lastPercent = 0;
  const updatePercent = (loadedBytes: number) => {
    if (!onProgress) return;
    if (totalBytes <= 0) {
      onProgress(0);
      return;
    }
    const next = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
    if (next >= lastPercent) {
      lastPercent = next;
      onProgress(next);
    }
  };

  onProgress?.(0);

  const writer = new ZipWriter(new BlobWriter("application/zip"), {
    level: compress ? 6 : 0,
  });

  for (const file of files) {
    const entrySize = typeof file.data === "string" ? getByteLength(file.data) : file.data.size;
    const reader =
      typeof file.data === "string" ? new TextReader(file.data) : new BlobReader(file.data);
    let lastLoaded = 0;
    await writer.add(file.name, reader, {
      onprogress: async (loaded) => {
        if (loaded < lastLoaded) return;
        lastLoaded = loaded;
        updatePercent(Math.min(totalBytes, completedBytes + loaded));
      },
    });
    completedBytes += entrySize;
    updatePercent(completedBytes);
  }

  const blob = await writer.close(undefined, {
    onprogress: async (progress, total) => {
      if (!onProgress || !total || total <= 0) return;
      const next = Math.min(100, Math.round((progress / total) * 100));
      if (next >= lastPercent) {
        lastPercent = next;
        onProgress(next);
      }
    },
  } as ZipWriterCloseOptions);

  onProgress?.(100);
  return blob;
};

export const createZipBlobWithProgress = async (
  params: CreateZipWithProgressParams,
): Promise<Blob> => {
  try {
    return await createZipBlob(params, true);
  } catch {
    return await createZipBlob(params, false);
  }
};
