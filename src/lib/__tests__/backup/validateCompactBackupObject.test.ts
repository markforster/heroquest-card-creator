import { validateCompactBackupObject } from "@/lib/backup/backup-validation";

const valid = { schemaVersion: 1, cards: [], assets: [], localStorage: {} };

describe("validateCompactBackupObject", () => {
  it("returns a structurally valid compact backup", () => {
    expect(validateCompactBackupObject(valid)).toBe(valid);
  });

  it.each([
    null,
    {},
    { ...valid, schemaVersion: 3 },
    { ...valid, cards: null },
    { ...valid, assets: null },
    { ...valid, localStorage: null },
  ])("rejects invalid compact backup structure", (candidate) => {
    expect(() => validateCompactBackupObject(candidate)).toThrow();
  });
});
