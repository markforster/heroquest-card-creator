import { getLocationOriginInfo, normalizeFileProtocolAssetUrl } from "@/lib/browser";

describe("getLocationOriginInfo", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("returns origin and protocol info", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "https://example.com",
        protocol: "https:",
      },
    });

    expect(getLocationOriginInfo()).toEqual({
      origin: "https://example.com",
      isFileProtocol: false,
    });
  });

  it("detects file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "null",
        protocol: "file:",
      },
    });

    expect(getLocationOriginInfo()).toEqual({
      origin: "null",
      isFileProtocol: true,
    });
  });
});

describe("normalizeFileProtocolAssetUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("rewrites absolute-root static paths in file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "null",
        protocol: "file:",
      },
    });

    expect(normalizeFileProtocolAssetUrl("/_next/static/chunks/app.js")).toBe(
      "./_next/static/chunks/app.js",
    );
  });

  it("keeps relative paths unchanged in file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "null",
        protocol: "file:",
      },
    });

    expect(normalizeFileProtocolAssetUrl("./local.png")).toBe("./local.png");
  });

  it("keeps blob/data/https URLs unchanged in file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "null",
        protocol: "file:",
      },
    });

    expect(normalizeFileProtocolAssetUrl("blob:abc")).toBe("blob:abc");
    expect(normalizeFileProtocolAssetUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
    expect(normalizeFileProtocolAssetUrl("https://example.com/a.png")).toBe(
      "https://example.com/a.png",
    );
  });

  it("keeps absolute-root paths unchanged outside file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost:3000",
        protocol: "http:",
      },
    });

    expect(normalizeFileProtocolAssetUrl("/_next/static/chunks/app.js")).toBe(
      "/_next/static/chunks/app.js",
    );
  });
});
