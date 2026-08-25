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
});
