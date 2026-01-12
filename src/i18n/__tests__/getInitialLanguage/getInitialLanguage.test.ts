import { getInitialLanguage, LANGUAGE_STORAGE_KEY } from "@/i18n/getInitialLanguage";

describe("getInitialLanguage (jsdom)", () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).navigator;
    }
  });

  it("returns stored language when supported", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("fr");
  });

  it("ignores stored language when unsupported and falls back to browser language", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "xx");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "de-DE" },
    });
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("de");
  });

  it("returns browser primary language when supported", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "es-ES" },
    });
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("es");
  });

  it("returns en when navigator is undefined", () => {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: undefined });
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("returns en when browser language is empty", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "" },
    });
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("returns en when browser language is unsupported", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "xx-YY" },
    });
    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("returns browser language even when localStorage throws", () => {
    const getSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "it-IT" },
    });

    expect(getInitialLanguage(LANGUAGE_STORAGE_KEY)).toBe("it");

    getSpy.mockRestore();
  });
});

