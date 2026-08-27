import {
  checkStoragePersistence,
  requestStoragePersistence,
  supportsStoragePersistence,
} from "@/lib/storage-persistence";

const originalNavigator = global.navigator;

function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: storage ? { storage } : {},
  });
}

describe("storage persistence helpers", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  });

  it("reports unsupported when the browser storage API is missing", async () => {
    mockStorage(undefined);

    expect(supportsStoragePersistence()).toBe(false);
    await expect(checkStoragePersistence()).resolves.toBe("unsupported");
    await expect(requestStoragePersistence()).resolves.toBe("unsupported");
  });

  it("checks whether local storage is already protected", async () => {
    const persist = jest.fn().mockResolvedValue(true);
    mockStorage({
      persisted: jest.fn().mockResolvedValue(true),
      persist,
    });

    expect(supportsStoragePersistence()).toBe(true);
    await expect(checkStoragePersistence()).resolves.toBe("protected");
    await expect(requestStoragePersistence()).resolves.toBe("protected");
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports not protected when persistence has not been granted", async () => {
    mockStorage({
      persisted: jest.fn().mockResolvedValue(false),
      persist: jest.fn().mockResolvedValue(false),
    });

    await expect(checkStoragePersistence()).resolves.toBe("not-protected");
    await expect(requestStoragePersistence()).resolves.toBe("not-protected");
  });

  it("reports unable to check when the browser throws", async () => {
    mockStorage({
      persisted: jest.fn().mockRejectedValue(new Error("denied")),
      persist: jest.fn().mockRejectedValue(new Error("denied")),
    });

    await expect(checkStoragePersistence()).resolves.toBe("unable-to-check");
    await expect(requestStoragePersistence()).resolves.toBe("unable-to-check");
  });
});
