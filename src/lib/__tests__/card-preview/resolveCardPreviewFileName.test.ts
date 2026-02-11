import { resolveCardPreviewFileName } from "@/lib/card-preview";

describe("resolveCardPreviewFileName", () => {
  it("uses the card title when available", () => {
    expect(resolveCardPreviewFileName({ title: "My Card" }, "Template")).toBe("my-card.png");
  });

  it("falls back to template name when title is missing", () => {
    expect(resolveCardPreviewFileName({}, "Template Name")).toBe("template-name.png");
  });

  it("uses fallback when title and template name are empty", () => {
    expect(resolveCardPreviewFileName({ title: "   " }, "", "fallback")).toBe("fallback.png");
  });

  it("strips unsafe characters and lowercases", () => {
    expect(resolveCardPreviewFileName({ title: " Hero! @#$ " }, "Template")).toBe("hero-.png");
  });
});
