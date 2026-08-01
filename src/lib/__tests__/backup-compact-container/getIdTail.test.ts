import { getIdTail } from "@/lib/backup/backup-compact-container";

describe("getIdTail", () => {
  it("returns the requested suffix without padding short identifiers", () => {
    expect(getIdTail("abcdefgh", 4)).toBe("efgh");
    expect(getIdTail("abc", 4)).toBe("abc");
  });
});
