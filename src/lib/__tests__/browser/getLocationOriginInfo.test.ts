import { getLocationOriginInfo } from "@/lib/browser";

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
