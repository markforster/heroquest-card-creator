import { parseBackupMetadata } from "@/lib/backup/backup-validation";

describe("parseBackupMetadata", () => {
  it("parses and strips null properties before validation", () => {
    expect(
      parseBackupMetadata(
        JSON.stringify({
          schemaVersion: 2,
          cards: [],
          assets: [],
          localStorage: {},
          optional: null,
        }),
      ),
    ).toEqual({ schemaVersion: 2, cards: [], assets: [], localStorage: {} });
  });

  it("reports malformed JSON as an invalid backup", () => {
    expect(() => parseBackupMetadata("not-json")).toThrow(
      "This file is not a valid HeroQuest Card Maker backup",
    );
  });
});
