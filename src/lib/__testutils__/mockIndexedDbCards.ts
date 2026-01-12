import type { CardRecord } from "@/types/cards-db";
import type { CardStatus } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

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

class MockCardsStore {
  public add = jest.fn();
  public get = jest.fn();
  public put = jest.fn();
  public delete = jest.fn();
  public openCursor = jest.fn();

  public indexNames: { contains: (name: string) => boolean };
  public index: (name: string) => { openCursor: jest.Mock };

  public transaction: { oncomplete: null | (() => void); onerror: null | (() => void); error?: unknown } =
    { oncomplete: null, onerror: null, error: undefined };

  private records = new Map<string, CardRecord>();
  private failures = new Map<string, unknown>();
  private availableIndexes = new Set<string>();

  constructor(initial: CardRecord[] = [], indexNames: string[] = []) {
    initial.forEach((r) => this.records.set(r.id, r));
    indexNames.forEach((n) => this.availableIndexes.add(n));

    this.indexNames = { contains: (name) => this.availableIndexes.has(name) };

    const openCursorImpl = (indexName: string) => (key: unknown) => {
      const req = createRequest<Cursor | null>(null);

      const failure = this.consumeFailure("openCursor");
      if (failure !== null) {
        queueError(req, failure === FAIL_WITHOUT_ERROR ? undefined : failure);
        return req;
      }

      let values = Array.from(this.records.values());

      if (indexName === "status") {
        values = values.filter((r) => r.status === key);
      } else if (indexName === "templateId") {
        values = values.filter((r) => r.templateId === key);
      } else if (indexName === "templateId_status") {
        const [templateId, status] = key as [TemplateId, CardStatus];
        values = values.filter((r) => r.templateId === templateId && r.status === status);
      }

      let cursorIndex = 0;

      const advance = () => {
        if (cursorIndex >= values.length) {
          req.result = null;
          queueSuccess(req);
          return;
        }

        const current = values[cursorIndex];
        const cursor: Cursor = {
          value: current,
          continue: () => {
            cursorIndex += 1;
            advance();
          },
        };
        req.result = cursor;
        queueSuccess(req);
      };

      advance();
      return req;
    };

    const indexOpenCursors: Record<string, jest.Mock> = {
      templateId_status: jest.fn(openCursorImpl("templateId_status")),
      status: jest.fn(openCursorImpl("status")),
      templateId: jest.fn(openCursorImpl("templateId")),
    };

    this.index = (name: string) => {
      const openCursor = indexOpenCursors[name] ?? jest.fn(openCursorImpl(name));
      return { openCursor };
    };

    this.add.mockImplementation((record: CardRecord) => {
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

    this.put.mockImplementation((record: CardRecord) => {
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

    this.openCursor.mockImplementation(() => openCursorImpl("openCursor")(undefined));
  }

  public seed(records: CardRecord[]) {
    records.forEach((r) => this.records.set(r.id, r));
  }

  public setIndexNames(names: string[]) {
    this.availableIndexes = new Set(names);
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

  public failNextTransaction(error?: unknown) {
    this.transaction.error = error;
    this.transaction.onerror?.();
  }

  public completeTransaction() {
    this.transaction.oncomplete?.();
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

export function installMockIndexedDbCards(options: {
  hasCardsStore: boolean;
  triggerUpgrade?: boolean;
  initialCards?: CardRecord[];
  indexNames?: Array<"templateId_status" | "status" | "templateId">;
}) {
  const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const stores = new Set<string>();
  if (options.hasCardsStore) stores.add("cards");

  const cardsStore = new MockCardsStore(options.initialCards ?? [], options.indexNames ?? []);

  const assetsStore = {
    indexNames: { contains: () => false },
    createIndex: jest.fn(),
  };

  const db: MockDb = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    transaction: () => ({
      objectStore: () => cardsStore,
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

  const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
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

  const originalKeyRange = (globalThis as any).IDBKeyRange;
  (globalThis as any).IDBKeyRange = {
    only: (value: unknown) => value,
  };

  return {
    db,
    open,
    request,
    cardsStore,
    cleanup() {
      if (originalIndexedDbDescriptor) {
        Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).indexedDB;
      }

      (globalThis as any).IDBKeyRange = originalKeyRange;

      debugSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

