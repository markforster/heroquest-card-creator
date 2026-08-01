import { stripNulls } from "@/lib/backup/backup-validation";

describe("stripNulls", () => {
  it("recursively removes null object properties while preserving array positions", () => {
    expect(
      stripNulls({
        keep: 1,
        remove: null,
        nested: { remove: null, keep: true },
        list: [null, { remove: null, keep: "yes" }],
      }),
    ).toEqual({
      keep: 1,
      nested: { keep: true },
      list: [null, { keep: "yes" }],
    });
  });
});
