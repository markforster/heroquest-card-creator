import { resolveZipFileName } from "@/components/Stockpile/stockpile-utils";

describe("resolveZipFileName", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("uses the collection name when provided", () => {
    jest.setSystemTime(new Date(2026, 1, 11, 15, 4, 5));
    const result = resolveZipFileName(() => "My Collection");
    expect(result).toBe("my-collection-20260211-150405.zip");
  });

  it("falls back to heroquest-cards when no collection name", () => {
    jest.setSystemTime(new Date(2026, 1, 11, 15, 4, 5));
    const result = resolveZipFileName(() => null);
    expect(result).toBe("heroquest-cards-20260211-150405.zip");
  });
});
