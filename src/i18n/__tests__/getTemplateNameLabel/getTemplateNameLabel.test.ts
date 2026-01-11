import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";

describe("getTemplateNameLabel", () => {
  it("returns the translated label when available", () => {
    expect(getTemplateNameLabel("en", { id: "hero", name: "Hero" })).toBe("Hero Card");
  });

  it("falls back to template.name when language is unknown at runtime", () => {
    expect(getTemplateNameLabel("xx" as never, { id: "hero", name: "Hero" })).toBe("Hero");
  });
});

