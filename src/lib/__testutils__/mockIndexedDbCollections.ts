import type { CollectionRecord } from "@/types/collections-db";

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

function queueError(req: Request<unknown>, error: unknown) {
  req.error = error;
  queueMicrotask(() => req.onerror?.());
}

type Cursor = {
  value: unknown;
  continue: () => void;
};

const FAIL_WITHOUT_ERROR = Symbol("FAIL_WITHOUT_ERROR");

class MockCollectionsStore {
  public add = jest.fn();
  public get = jest.fn();
  public put = jest.fn();
  public delete = jest.fn();
  public openCursor = jest.fn();

  private records = new Map<string, CollectionRecord>();
  private failures = new Map<string, unknown>();

  constructor(initial: CollectionRecord[] = []) {
    initial.forEach((r) => this.records.set(r.id, r));

    this.add.mockImplementation((record: CollectionRecord) => {
      const req = createRequest(undefined);
      const failure = this.consumeFailure("add");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
      } else {
        this.records.set(record.id, record);
        queueSuccess(req);
      }
      return req;
    });

    this.get.mockImplementation((id: string) => {
      const req = createRequest(this.records.get(id));
      const failure = this.consumeFailure("get");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
      } else {
        queueSuccess(req);
      }
      return req;
    });

    this.put.mockImplementation((record: CollectionRecord) => {
      const req = createRequest(undefined);
      const failure = this.consumeFailure("put");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
      } else {
        this.records.set(record.id, record);
        queueSuccess(req);
      }
      return req;
    });

    this.delete.mockImplementation((id: string) => {
      const req = createRequest(undefined);
      const failure = this.consumeFailure("delete");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
      } else {
        this.records.delete(id);
        queueSuccess(req);
      }
      return req;
    });

    this.openCursor.mockImplementation(() => {
      const values = Array.from(this.records.values());
      let index = 0;

      const req = createRequest<Cursor | null>(null);

      const failure = this.consumeFailure("openCursor");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
        return req;
      }

      const advance = () => {
        if (index >= values.length) {
          req.result = null;
          queueSuccess(req);
          return;
        }
        const current = values[index];
        const cursor: Cursor = {
          value: current,
          continue: () => {
            index += 1;
            advance();
          },
        };
        req.result = cursor;
        queueSuccess(req);
      };

      advance();
      return req;
    });
  }

  public failNext(
    op: "add" | "get" | "put" | "delete" | "openCursor",
    error?: unknown,
  ) {
    if (arguments.length === 1) {
      this.failures.set(op, new Error("fail"));
      return;
    }
    this.failures.set(op, error === undefined ? FAIL_WITHOUT_ERROR : error);
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
  transaction: (
    name: string,
    mode: IDBTransactionMode,
  ) => { objectStore: (store: string) => any };
  createObjectStore: (name: string, options: { keyPath: string }) => any;
};

export function installMockIndexedDbCollections(options: {
  hasCollectionsStore: boolean;
  triggerUpgrade?: boolean;
  initialCollections?: CollectionRecord[];
}) {
  const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const stores = new Set<string>();
  if (options.hasCollectionsStore) stores.add("collections");

  const collectionsStore = new MockCollectionsStore(options.initialCollections ?? []);

  const assetsStore = {
    indexNames: { contains: () => false },
    createIndex: jest.fn(),
  };

  const db: MockDb = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    transaction: () => ({
      objectStore: () => collectionsStore,
    }),
    createObjectStore: (name) => {
      stores.add(name);
      if (name === "assets") return assetsStore;
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

  const originalDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
  const open = jest.fn(() => {
    queueMicrotask(() => {
      if (options.triggerUpgrade) {
        request.onupgradeneeded?.();
      }
      request.onsuccess?.();
    });
    return request;
  });

  Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

  return {
    db,
    open,
    request,
    collectionsStore,
    cleanup() {
      if (originalDescriptor) {
        Object.defineProperty(window, "indexedDB", originalDescriptor);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).indexedDB;
      }
      debugSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}
