"use client";

import {
  estimateIndexedDbSize,
  estimateRecordBytes,
  type IndexedDbRecordSizes,
} from "@/lib/indexeddb-size-estimate";
import { openHqccDexieDb } from "@/lib/hqcc-dexie";

const QUEUE_KEY = "hqcc.dbEstimate.queue.v1";
const TOTALS_KEY = "hqcc.dbEstimate.totals.v1";
const RECORD_SIZES_KEY = "hqcc.dbEstimate.recordSizes.v1";
const DEFAULT_BATCH = 25;

export type DbEstimateTotals = {
  totalBytes: number;
  recordsScanned: number;
  byStore: Record<string, { bytes: number; records: number }>;
  lastUpdated: string | null;
};

type QueueItem = { store: string; id: string };

type DbEstimateStatus = DbEstimateTotals & {
  processing: boolean;
  queueLength: number;
};

let paused = false;
let processing = false;
let queue: QueueItem[] | null = null;
let queueSet: Set<string> | null = null;
let totals: DbEstimateTotals | null = null;
let recordSizes: IndexedDbRecordSizes | null = null;
const listeners = new Set<(status: DbEstimateStatus) => void>();

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadQueue(): QueueItem[] {
  if (queue) return queue;
  const stored = safeParse<QueueItem[]>(window.localStorage.getItem(QUEUE_KEY), []);
  queue = stored;
  queueSet = new Set(stored.map((item) => `${item.store}::${item.id}`));
  return queue;
}

function saveQueue() {
  if (!queue) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage failures
  }
}

function loadTotals(): DbEstimateTotals {
  if (totals) return totals;
  const stored = safeParse<DbEstimateTotals>(window.localStorage.getItem(TOTALS_KEY), {
    totalBytes: 0,
    recordsScanned: 0,
    byStore: {},
    lastUpdated: null,
  });
  totals = stored;
  return totals;
}

function saveTotals() {
  if (!totals) return;
  try {
    window.localStorage.setItem(TOTALS_KEY, JSON.stringify(totals));
  } catch {
    // ignore storage failures
  }
}

function loadRecordSizes(): IndexedDbRecordSizes {
  if (recordSizes) return recordSizes;
  const stored = safeParse<IndexedDbRecordSizes>(window.localStorage.getItem(RECORD_SIZES_KEY), {});
  recordSizes = stored;
  return recordSizes;
}

function saveRecordSizes() {
  if (!recordSizes) return;
  try {
    window.localStorage.setItem(RECORD_SIZES_KEY, JSON.stringify(recordSizes));
  } catch {
    // ignore storage failures
  }
}

function emitStatus() {
  const currentTotals = loadTotals();
  const queueItems = loadQueue();
  const status: DbEstimateStatus = {
    ...currentTotals,
    processing,
    queueLength: queueItems.length,
  };
  listeners.forEach((listener) => listener(status));
}

function scheduleIdle(fn: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn());
    return;
  }
  setTimeout(fn, 0);
}

export function subscribeDbEstimateStatus(listener: (status: DbEstimateStatus) => void): () => void {
  listeners.add(listener);
  listener({ ...loadTotals(), processing, queueLength: loadQueue().length });
  return () => listeners.delete(listener);
}

export function getDbEstimateStatus(): DbEstimateStatus {
  return { ...loadTotals(), processing, queueLength: loadQueue().length };
}

export function setDbEstimatePaused(value: boolean) {
  paused = value;
  if (!paused && loadQueue().length > 0) {
    scheduleIdle(() => {
      void processDbEstimateQueue();
    });
  }
}

export function clearDbEstimateCache() {
  try {
    window.localStorage.removeItem(QUEUE_KEY);
    window.localStorage.removeItem(TOTALS_KEY);
    window.localStorage.removeItem(RECORD_SIZES_KEY);
  } catch {
    // ignore storage failures
  }
  queue = [];
  queueSet = new Set();
  totals = {
    totalBytes: 0,
    recordsScanned: 0,
    byStore: {},
    lastUpdated: null,
  };
  recordSizes = {};
  emitStatus();
}

export async function runFullDbEstimate(): Promise<void> {
  const estimate = await estimateIndexedDbSize({ includeRecordSizes: true });
  totals = {
    totalBytes: estimate.totalBytes,
    recordsScanned: estimate.recordsScanned,
    byStore: estimate.byStore,
    lastUpdated: estimate.lastUpdated,
  };
  recordSizes = estimate.recordSizes ?? {};
  queue = [];
  queueSet = new Set();
  saveQueue();
  saveTotals();
  saveRecordSizes();
  emitStatus();
}

export function enqueueDbEstimateChange(store: string, id: string) {
  if (paused) return;
  if (!store || !id) return;

  const items = loadQueue();
  const set = queueSet ?? new Set<string>();
  const key = `${store}::${id}`;
  if (set.has(key)) return;

  items.push({ store, id });
  set.add(key);
  queueSet = set;
  saveQueue();
  emitStatus();
  scheduleIdle(() => {
    void processDbEstimateQueue();
  });
}

async function readStoreRecord(
  store: string,
  id: string,
): Promise<unknown | undefined> {
  const db = await openHqccDexieDb();

  switch (store) {
    case "assets":
      return db.assets.get(id);
    case "collections":
      return db.collections.get(id);
    case "settings":
      return db.settings.get(id);
    case "pairs":
      return db.pairs.get(id);
    case "decks":
      return db.decks.get(id);
    case "deckGroups":
      return db.deckGroups.get(id);
    case "deckSets":
      return db.deckSets.get(id);
    case "deckEntries":
      return db.deckEntries.get(id);
    default:
      return undefined;
  }
}

async function getLogicalCardRecordSize(id: string): Promise<number> {
  const db = await openHqccDexieDb();
  const [
    baseRecord,
    thumbnailRecord,
    slotLinks,
    backgrounds,
    borders,
    titles,
    texts,
    copyrights,
    images,
    icons,
    heroStats,
    monsterStats,
  ] = await Promise.all([
    db.cardsBase.get(id),
    db.cardThumbnails.get(id),
    db.cardSlotLinks.where("cardId").equals(id).toArray(),
    db.cardBackgroundComponents.where("cardId").equals(id).toArray(),
    db.cardBorderComponents.where("cardId").equals(id).toArray(),
    db.cardTitleComponents.where("cardId").equals(id).toArray(),
    db.cardTextComponents.where("cardId").equals(id).toArray(),
    db.cardCopyrightComponents.where("cardId").equals(id).toArray(),
    db.cardImageComponents.where("cardId").equals(id).toArray(),
    db.cardIconComponents.where("cardId").equals(id).toArray(),
    db.cardHeroStatsComponents.where("cardId").equals(id).toArray(),
    db.cardMonsterStatsComponents.where("cardId").equals(id).toArray(),
  ]);

  if (!baseRecord) {
    return 0;
  }

  const records: unknown[] = [
    baseRecord,
    thumbnailRecord,
    ...slotLinks,
    ...backgrounds,
    ...borders,
    ...titles,
    ...texts,
    ...copyrights,
    ...images,
    ...icons,
    ...heroStats,
    ...monsterStats,
  ].filter((record) => record != null);

  let total = 0;
  for (let index = 0; index < records.length; index += 1) {
    total += estimateRecordBytes(records[index]).bytes;
  }
  return total;
}

async function getRecordSize(store: string, id: string): Promise<number> {
  if (store === "cards") {
    return getLogicalCardRecordSize(id);
  }

  const record = await readStoreRecord(store, id);
  if (!record) {
    return 0;
  }

  return estimateRecordBytes(record).bytes;
}

export async function processDbEstimateQueue(batchSize: number = DEFAULT_BATCH): Promise<void> {
  if (paused || processing) return;
  processing = true;
  emitStatus();

  try {
    const items = loadQueue();
    if (!items.length) {
      processing = false;
      emitStatus();
      return;
    }

    const sizeMap = loadRecordSizes();
    const totalsState = loadTotals();

    const batch = items.splice(0, batchSize);
    if (queueSet) {
      batch.forEach((item) => queueSet?.delete(`${item.store}::${item.id}`));
    }
    saveQueue();

    for (const item of batch) {
      const prevStore = sizeMap[item.store] ?? {};
      const prevSize = prevStore[item.id] ?? 0;
      let nextSize = 0;
      try {
        nextSize = await getRecordSize(item.store, item.id);
      } catch {
        nextSize = prevSize;
      }

      const delta = nextSize - prevSize;
      if (!sizeMap[item.store]) {
        sizeMap[item.store] = {};
      }

      if (nextSize > 0) {
        sizeMap[item.store][item.id] = nextSize;
      } else {
        delete sizeMap[item.store][item.id];
      }

      if (!totalsState.byStore[item.store]) {
        totalsState.byStore[item.store] = { bytes: 0, records: 0 };
      }

      totalsState.totalBytes += delta;
      totalsState.byStore[item.store].bytes += delta;
      if (prevSize === 0 && nextSize > 0) {
        totalsState.byStore[item.store].records += 1;
        totalsState.recordsScanned += 1;
      } else if (prevSize > 0 && nextSize === 0) {
        totalsState.byStore[item.store].records = Math.max(
          0,
          totalsState.byStore[item.store].records - 1,
        );
        totalsState.recordsScanned = Math.max(0, totalsState.recordsScanned - 1);
      }
    }

    totalsState.lastUpdated = new Date().toLocaleString();
    recordSizes = sizeMap;
    totals = totalsState;
    saveTotals();
    saveRecordSizes();
    emitStatus();
  } finally {
    processing = false;
    emitStatus();
    if (loadQueue().length > 0 && !paused) {
      scheduleIdle(() => {
        void processDbEstimateQueue(batchSize);
      });
    }
  }
}
