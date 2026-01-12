import type { AssetRecord, AssetRecordWithBlob } from "@/lib/assets-db";

type Request<T> = {
  result: T;
  error?: unknown;
  onsuccess: null | (() => void);
  onerror: null | (() => void);
};

function createRequest<T>(result: T): Request<T> {
  return { result, onsuccess: null, onerror: null };
}

function queueSuccess(req: Request<unknown>) {
  queueMicrotask(() => req.onsuccess?.());
}

function queueError(req: Request<unknown>, error: unknown, setError: boolean) {
  if (setError) {
    req.error = error;
  }
  queueMicrotask(() => req.onerror?.());
}

const FAIL_WITHOUT_ERROR = Symbol("FAIL_WITHOUT_ERROR");

type TransactionMode = "readonly" | "readwrite";

type MockTx = {
  oncomplete: null | (() => void);
  onerror: null | (() => void);
  error?: unknown;
  objectStore: (name: string) => any;
};

class MockAssetsStore {
  public put = jest.fn();
  public get = jest.fn();
  public getAll = jest.fn();
  public delete = jest.fn();

  public indexNames: { contains: (name: string) => boolean };
  public index = jest.fn();

  private records = new Map<string, AssetRecordWithBlob | (AssetRecord & { blob?: Blob })>();
  private failures = new Map<string, unknown>();

  private txFailure: unknown | null = null;
  private txFailWithoutError = false;
  private txScheduled = false;
  private currentTx: MockTx | null = null;

  private hasCreatedAtIndex: boolean;

  constructor(initial: Array<AssetRecordWithBlob | (AssetRecord & { blob?: Blob })> = [], opts?: { hasCreatedAtIndex?: boolean }) {
    initial.forEach((r) => this.records.set(r.id, r));
    this.hasCreatedAtIndex = opts?.hasCreatedAtIndex ?? true;

    this.indexNames = { contains: (name) => name === "createdAt" && this.hasCreatedAtIndex };

    const index = {
      getAll: jest.fn(() => this.handleGetAll("indexGetAll")),
    };
    this.index.mockImplementation(() => index);

    this.put.mockImplementation((record: AssetRecord & { blob: Blob }) => {
      const req = createRequest(undefined);
      this.records.set(record.id, record);
      queueSuccess(req);
      if (this.currentTx) {
        this.scheduleTxCompletion(this.currentTx);
      }
      return req;
    });

    this.get.mockImplementation((id: string) => {
      const failure = this.consumeFailure("get");
      const req = createRequest(this.records.get(id));
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure, failure !== FAIL_WITHOUT_ERROR);
      } else {
        queueSuccess(req);
      }
      return req;
    });

    this.getAll.mockImplementation(() => this.handleGetAll("getAll"));

    this.delete.mockImplementation((id: string) => {
      const req = createRequest(undefined);
      this.records.delete(id);
      queueSuccess(req);
      if (this.currentTx) {
        this.scheduleTxCompletion(this.currentTx);
      }
      return req;
    });
  }

  public bindTx(tx: MockTx | null) {
    this.currentTx = tx;
    this.txScheduled = false;
  }

  public seed(records: Array<AssetRecordWithBlob | (AssetRecord & { blob?: Blob })>) {
    records.forEach((r) => this.records.set(r.id, r));
  }

  public setHasCreatedAtIndex(value: boolean) {
    this.hasCreatedAtIndex = value;
  }

  public failNextRequest(op: "get" | "getAll" | "indexGetAll", error?: unknown) {
    if (arguments.length === 1) {
      this.failures.set(op, new Error("fail"));
      return;
    }
    this.failures.set(op, error === undefined ? FAIL_WITHOUT_ERROR : error);
  }

  public failNextTransaction(error?: unknown) {
    this.txFailure = error ?? null;
    this.txFailWithoutError = arguments.length === 0 || error === undefined;
    this.txScheduled = false;
  }

  public scheduleTxCompletion(tx: MockTx) {
    if (this.txScheduled) return;
    this.txScheduled = true;

    queueMicrotask(() => {
      if (this.txFailure !== null || this.txFailWithoutError) {
        if (!this.txFailWithoutError) {
          tx.error = this.txFailure;
        } else {
          tx.error = undefined;
        }
        tx.onerror?.();
        this.txFailure = null;
        this.txFailWithoutError = false;
        return;
      }
      tx.oncomplete?.();
    });
  }

  private handleGetAll(op: "getAll" | "indexGetAll") {
    const failure = this.consumeFailure(op);
    const req = createRequest(Array.from(this.records.values()));
    if (failure !== null) {
      queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure, failure !== FAIL_WITHOUT_ERROR);
    } else {
      queueSuccess(req);
    }
    return req;
  }

  private consumeFailure(op: string): unknown | null {
    if (!this.failures.has(op)) return null;
    const failure = this.failures.get(op);
    this.failures.delete(op);
    return failure;
  }
}

type MockDb = {
  objectStoreNames: { contains: (name: string) => boolean };
  transaction: (name: string, mode: TransactionMode) => MockTx;
  createObjectStore: (name: string, options: { keyPath: string }) => any;
};

export function installMockIndexedDbAssets(options: {
  hasAssetsStore: boolean;
  initialAssets?: Array<AssetRecordWithBlob | (AssetRecord & { blob?: Blob })>;
  hasCreatedAtIndex?: boolean;
}) {
  const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const stores = new Set<string>();
  if (options.hasAssetsStore) stores.add("assets");

  const assetsStore = new MockAssetsStore(options.initialAssets ?? [], {
    hasCreatedAtIndex: options.hasCreatedAtIndex ?? true,
  });

  const db: MockDb = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    transaction: (_name, mode) => {
      const tx: MockTx = {
        oncomplete: null,
        onerror: null,
        error: undefined,
        objectStore: () => assetsStore,
      };

      // For readwrite flows, completion/error is driven by store.put/delete calls.
      // For readonly flows, tx completion isn't observed by assets-db.
      assetsStore.bindTx(mode === "readwrite" ? tx : null);
      return tx;
    },
    createObjectStore: (name) => {
      stores.add(name);
      return {};
    },
  };

  const request = {
    result: db,
    error: undefined as unknown,
    onupgradeneeded: null as null | (() => void),
    onsuccess: null as null | (() => void),
    onerror: null as null | (() => void),
  };

  const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
  const open = jest.fn(() => {
    queueMicrotask(() => request.onsuccess?.());
    return request;
  });
  Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

  return {
    db,
    open,
    request,
    assetsStore,
    cleanup() {
      if (originalIndexedDbDescriptor) {
        Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).indexedDB;
      }

      debugSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}
