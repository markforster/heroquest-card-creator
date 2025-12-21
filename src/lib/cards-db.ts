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

export async function createCard(
  input: Omit<CardRecord, "id" | "createdAt" | "updatedAt" | "nameLower" | "schemaVersion">,
): Promise<CardRecord> {
  const now = Date.now();
  const id = generateId();
  const base: CardRecord = {
    ...input,
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
    ...patch,
    updatedAt: now,
  };

  if (patch.name) {
    next.nameLower = patch.name.toLocaleLowerCase();
  }

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update card"));
  });

  return next;
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const store = await getCardsStore("readonly");

  return new Promise<CardRecord | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      resolve((request.result as CardRecord | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load card"));
    };
  });
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
      cards.push(cursor.value as CardRecord);
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

export async function deleteCard(id: string): Promise<void> {
  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete card"));
  });
}

export async function deleteCards(ids: string[]): Promise<void> {
  if (!ids.length) return;

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
