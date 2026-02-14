"use client";

import type { CardRecord, CardStatus } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

import { openHqccDb } from "./hqcc-db";

import { generateId } from ".";

import type { HqccDb } from "./hqcc-db";

async function getCardsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db: HqccDb = await openHqccDb();
  const tx = db.transaction("cards", mode);
  return tx.objectStore("cards");
}

async function repairThumbnailBlob(record: CardRecord): Promise<void> {
  if (!record.thumbnailBlob) return;
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) return;
  try {
    const store = await getCardsStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...record,
        thumbnailBlob: normalized,
      });
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to repair thumbnail blob"));
    });
  } catch {
    // Ignore repair failures.
  }
}

function normalizeThumbnailBlob(blob?: Blob | null): Blob | null | undefined {
  if (!blob) return blob;
  if (blob.type) return blob;
  try {
    return new Blob([blob], { type: "image/png" });
  } catch {
    return blob;
  }
}

function normalizeCardRecord(record: CardRecord): CardRecord {
  if (!record.thumbnailBlob) {
    return record;
  }
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) {
    return record;
  }
  void repairThumbnailBlob(record);
  return {
    ...record,
    thumbnailBlob: normalized,
  };
}

export async function createCard(
  input: Omit<CardRecord, "id" | "createdAt" | "updatedAt" | "nameLower" | "schemaVersion">,
): Promise<CardRecord> {
  const now = Date.now();
  const id = generateId();
  const normalizedThumbnail = normalizeThumbnailBlob(input.thumbnailBlob);
  const base: CardRecord = {
    ...input,
    ...(normalizedThumbnail !== input.thumbnailBlob
      ? { thumbnailBlob: normalizedThumbnail }
      : {}),
    id,
    createdAt: now,
    updatedAt: now,
    nameLower: input.name.toLocaleLowerCase(),
    schemaVersion: 1,
  };

  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.add(base);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create card"));
  });

  return base;
}

export async function updateCard(
  id: string,
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<CardRecord | null> {
  const store = await getCardsStore("readwrite");
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  const existing = await new Promise<CardRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CardRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load card for update"));
    };
  });

  if (!existing) {
    return null;
  }

  const now = Date.now();
  const next: CardRecord = {
    ...existing,
    ...normalizedPatch,
    updatedAt: now,
  };

  if (normalizedPatch.name) {
    next.nameLower = normalizedPatch.name.toLocaleLowerCase();
  }

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update card"));
  });

  return next;
}

export async function updateCards(
  ids: string[],
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<void> {
  if (!ids.length) return;
  const store = await getCardsStore("readwrite");
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  await new Promise<void>((resolve, reject) => {
    let remaining = ids.length;
    let failed = false;

    ids.forEach((id) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        if (failed) return;
        const existing = getRequest.result as CardRecord | undefined;
        if (!existing) {
          remaining -= 1;
          if (remaining === 0) resolve();
          return;
        }
        const next: CardRecord = {
          ...existing,
          ...normalizedPatch,
          updatedAt: Date.now(),
        };
        if (normalizedPatch.name) {
          next.nameLower = normalizedPatch.name.toLocaleLowerCase();
        }
        const putRequest = store.put(next);
        putRequest.onerror = () => {
          if (failed) return;
          failed = true;
          reject(putRequest.error ?? new Error("Failed to update card"));
        };
        putRequest.onsuccess = () => {
          remaining -= 1;
          if (remaining === 0) resolve();
        };
      };
      getRequest.onerror = () => {
        if (failed) return;
        failed = true;
        reject(getRequest.error ?? new Error("Failed to load card for update"));
      };
    });
  });
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const store = await getCardsStore("readonly");

  return new Promise<CardRecord | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = (request.result as CardRecord | undefined) ?? null;
      resolve(record ? normalizeCardRecord(record) : null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load card"));
    };
  });
}

export async function touchCardLastViewed(
  id: string,
  viewedAt: number = Date.now(),
): Promise<CardRecord | null> {
  const store = await getCardsStore("readwrite");

  const existing = await new Promise<CardRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CardRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load card for lastViewed update"));
    };
  });

  if (!existing) {
    return null;
  }

  const next: CardRecord = {
    ...existing,
    lastViewedAt: viewedAt,
  };

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update card view"));
  });

  return next;
}

export type ListCardsFilter = {
  templateId?: TemplateId;
  status?: CardStatus;
  search?: string;
};

export async function listCards(filter: ListCardsFilter = {}): Promise<CardRecord[]> {
  const store = await getCardsStore("readonly");

  const { templateId, status, search } = filter;
  const cards: CardRecord[] = [];

  await new Promise<void>((resolve, reject) => {
    let request: IDBRequest;

    if (templateId && status && store.indexNames.contains("templateId_status")) {
      const index = store.index("templateId_status");
      request = index.openCursor(IDBKeyRange.only([templateId, status]));
    } else if (status && store.indexNames.contains("status")) {
      const index = store.index("status");
      request = index.openCursor(IDBKeyRange.only(status));
    } else if (templateId && store.indexNames.contains("templateId")) {
      const index = store.index("templateId");
      request = index.openCursor(IDBKeyRange.only(templateId));
    } else {
      request = store.openCursor();
    }

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve();
        return;
      }
      cards.push(normalizeCardRecord(cursor.value as CardRecord));
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list cards"));
    };
  });

  let filtered = cards;

  if (search) {
    const q = search.toLocaleLowerCase();
    filtered = filtered.filter((card) => card.nameLower.includes(q));
  }

  return filtered;
}

export async function normalizeSelfPairings(): Promise<number> {
  const cards = await listCards({ status: "saved" });
  const invalidIds = cards.filter((card) => card.pairedWith === card.id).map((card) => card.id);
  if (!invalidIds.length) return 0;
  await updateCards(invalidIds, { pairedWith: null });
  return invalidIds.length;
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await listCards({ status: "saved" });
  const pairedIds = cards.filter((card) => card.pairedWith === id).map((card) => card.id);
  if (pairedIds.length > 0) {
    await updateCards(pairedIds, { pairedWith: null });
  }

  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete card"));
  });
}

export async function deleteCards(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const idSet = new Set(ids);
  const cards = await listCards({ status: "saved" });
  const pairedIds = cards
    .filter((card) => card.pairedWith && idSet.has(card.pairedWith))
    .map((card) => card.id);
  if (pairedIds.length > 0) {
    await updateCards(pairedIds, { pairedWith: null });
  }

  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    ids.forEach((id) => {
      store.delete(id);
    });

    const tx = store.transaction;
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete cards"));
  });
}
