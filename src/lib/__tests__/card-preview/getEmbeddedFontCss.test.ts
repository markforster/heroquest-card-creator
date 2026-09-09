describe("getEmbeddedFontCss", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("loads and caches the generated embedded font CSS", async () => {
    const { getEmbeddedFontCss } = await import("@/lib/card-preview");

    const first = await getEmbeddedFontCss();
    const second = await getEmbeddedFontCss();

    expect(typeof first).toBe("string");
    expect(second).toBe(first);
    expect(first).toContain("font-style: italic");
  });

  it("keeps the bold italic face out of the regular Carter Sans family", async () => {
    const { getEmbeddedFontCss } = await import("@/lib/card-preview");

    const css = await getEmbeddedFontCss();
    const regularFamilyBlocks =
      css
        ?.split("@font-face")
        .filter((block) => block.includes('font-family: "Carter Sans W04";')) ?? [];

    expect(css).toContain('font-family: "Carter Sans W04 Bold Italic"');
    expect(
      regularFamilyBlocks.some(
        (block) => /font-style:\s*italic;/.test(block) && /font-weight:\s*700;/.test(block),
      ),
    ).toBe(false);
    expect(regularFamilyBlocks.every((block) => /font-style:\s*normal;/.test(block))).toBe(true);
  });
});
