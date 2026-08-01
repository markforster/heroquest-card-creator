import { fnv1aHex } from "@/lib/backup/backup-compact-container";

describe("fnv1aHex", () => {
  it("returns a stable eight-character hexadecimal hash", () => {
    expect(fnv1aHex("heroquest")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex("heroquest")).toBe(fnv1aHex("heroquest"));
    expect(fnv1aHex("heroquest")).not.toBe(fnv1aHex("HeroQuest"));
  });
});
