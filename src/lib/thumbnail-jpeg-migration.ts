"use client";

import { openHqccDb } from "@/lib/hqcc-db";
import type { CardRecord } from "@/types/cards-db";

const MIGRATION_KEY = "hqcc.migrations.thumbnailJpeg.v1";
const BATCH_SIZE = 6;
const JPEG_QUALITY = 0.8;

type MigrationState = "idle" | "running" | "done" | "error";

export type ThumbnailJpegMigrationStatus = {
  state: MigrationState;
  total: number;
  processed: number;
  converted: number;
  skipped: number;
  bytesBefore: number;
  bytesAfter: number;
  message?: string;
};

const listeners = new Set<(status: ThumbnailJpegMigrationStatus) => void>();
let currentStatus: ThumbnailJpegMigrationStatus = {
  state: "idle",
  total: 0,
  processed: 0,
  converted: 0,
  skipped: 0,
  bytesBefore: 0,
  bytesAfter: 0,
};
let inFlight: Promise<void> | null = null;

export function getThumbnailJpegMigrationStatus(): ThumbnailJpegMigrationStatus {
  return currentStatus;
}

export function subscribeThumbnailJpegMigration(
  listener: (status: ThumbnailJpegMigrationStatus) => void,
): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

function emitStatus(update: Partial<ThumbnailJpegMigrationStatus>) {
  currentStatus = { ...currentStatus, ...update };
  listeners.forEach((listener) => listener(currentStatus));
}

function scheduleIdle(): Promise<void> {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => requestIdleCallback(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertPngToJpeg(blob: Blob): Promise<Blob | null> {
  let width = 0;
  let height = 0;
  let drawSource: CanvasImageSource | null = null;

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    drawSource = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } else {
    const img = await loadImageFromBlob(blob);
    drawSource = img;
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
  }

  try {
    if (!drawSource || !width || !height) return null;

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(drawSource, 0, 0, width, height);
      return await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(drawSource, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((next) => resolve(next), "image/jpeg", JPEG_QUALITY),
    );
  } finally {
    if (drawSource && "close" in drawSource && typeof drawSource.close === "function") {
      drawSource.close();
    }
  }
}

async function countPngThumbnails(): Promise<number> {
  const db = await openHqccDb();
  return await new Promise<number>((resolve, reject) => {
    const tx = db.transaction("cards", "readonly");
    const store = tx.objectStore("cards");
    const request = store.openCursor();
    let count = 0;

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(count);
        return;
      }
      const record = cursor.value as CardRecord;
      const blob = record.thumbnailBlob;
      if (blob instanceof Blob && blob.type === "image/png") {
        count += 1;
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to count thumbnails"));
  });
}

type PngThumbnailEntry = { id: string; blob: Blob };

async function listPngThumbnails(): Promise<PngThumbnailEntry[]> {
  const db = await openHqccDb();
  return await new Promise<PngThumbnailEntry[]>((resolve, reject) => {
    const tx = db.transaction("cards", "readonly");
    const store = tx.objectStore("cards");
    const request = store.openCursor();
    const entries: PngThumbnailEntry[] = [];

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(entries);
        return;
      }
      const record = cursor.value as CardRecord;
      const blob = record.thumbnailBlob;
      if (record.id && blob instanceof Blob && blob.type === "image/png") {
        entries.push({ id: record.id, blob });
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to list thumbnails"));
  });
}

async function updateThumbnailBlob(id: string, blob: Blob): Promise<boolean> {
  const db = await openHqccDb();
  return await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction("cards", "readwrite");
    const store = tx.objectStore("cards");
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result as CardRecord | undefined;
      if (!record) {
        resolve(false);
        return;
      }
      const putRequest = store.put({
        ...record,
        thumbnailBlob: blob,
      });
      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = () =>
        reject(putRequest.error ?? new Error("Failed to update thumbnail"));
    };
    getRequest.onerror = () =>
      reject(getRequest.error ?? new Error("Failed to load thumbnail record"));
  });
}

export async function startThumbnailJpegMigration(): Promise<void> {
  if (typeof window === "undefined") return;
  if (inFlight) return inFlight;

  const alreadyDone = window.localStorage.getItem(MIGRATION_KEY) === "done";
  if (alreadyDone) {
    const remaining = await countPngThumbnails();
    if (remaining === 0) {
      emitStatus({
        state: "done",
        message: "No more batches to process. Thumbnail JPEG migration already completed.",
      });
      return;
    }
    window.localStorage.removeItem(MIGRATION_KEY);
  }

  inFlight = (async () => {
    emitStatus({
      state: "running",
      total: 0,
      processed: 0,
      converted: 0,
      skipped: 0,
      bytesBefore: 0,
      bytesAfter: 0,
      message: "Scanning thumbnails...",
    });

    const total = await countPngThumbnails();
    if (total === 0) {
      emitStatus({
        state: "done",
        total: 0,
        processed: 0,
        converted: 0,
        skipped: 0,
        bytesBefore: 0,
        bytesAfter: 0,
        message: "No PNG thumbnails found. No more batches to process.",
      });
      window.localStorage.setItem(MIGRATION_KEY, "done");
      return;
    }

    const entries = await listPngThumbnails();
    const bytesBefore = entries.reduce((sum, entry) => sum + entry.blob.size, 0);

    emitStatus({
      total,
      bytesBefore,
      bytesAfter: bytesBefore,
      message: "Converting PNG thumbnails to JPEG...",
    });

    let processed = 0;
    let converted = 0;
    let skipped = 0;
    let bytesAfter = bytesBefore;
    let batchCount = 0;

    const updateProgress = async () => {
      emitStatus({ processed, converted, skipped, bytesAfter });
      batchCount += 1;
      if (batchCount >= BATCH_SIZE) {
        batchCount = 0;
        await scheduleIdle();
      }
    };

    for (const entry of entries) {
      let nextBlob: Blob | null = null;
      try {
        nextBlob = await convertPngToJpeg(entry.blob);
      } catch {
        nextBlob = null;
      }

      processed += 1;

      if (nextBlob && nextBlob.size < entry.blob.size) {
        try {
          const updated = await updateThumbnailBlob(entry.id, nextBlob);
          if (updated) {
            converted += 1;
            bytesAfter += nextBlob.size - entry.blob.size;
          } else {
            skipped += 1;
          }
        } catch {
          skipped += 1;
        }
      } else {
        skipped += 1;
      }

      await updateProgress();
    }

    const finalStatus = getThumbnailJpegMigrationStatus();
    emitStatus({
      state: "done",
      message:
        finalStatus.converted === 0
          ? "No PNG thumbnails found. No more batches to process."
          : "No more batches to process. Thumbnail JPEG migration complete.",
    });
    window.localStorage.setItem(MIGRATION_KEY, "done");
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
