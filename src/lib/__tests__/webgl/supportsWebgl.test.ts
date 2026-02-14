describe("supportsWebgl", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  const loadSupportsWebgl = async () => {
    const mod = await import("@/lib/webgl");
    return mod.supportsWebgl;
  };

  it("returns true when webgl context is available", async () => {
    jest.spyOn(document, "createElement").mockReturnValue({
      getContext: (type: string) => (type === "webgl" ? {} : null),
    } as unknown as HTMLCanvasElement);

    const supportsWebgl = await loadSupportsWebgl();
    expect(supportsWebgl()).toBe(true);
  });

  it("falls back to experimental-webgl", async () => {
    jest.spyOn(document, "createElement").mockReturnValue({
      getContext: (type: string) => (type === "experimental-webgl" ? {} : null),
    } as unknown as HTMLCanvasElement);

    const supportsWebgl = await loadSupportsWebgl();
    expect(supportsWebgl()).toBe(true);
  });

  it("returns false when context is unavailable", async () => {
    jest.spyOn(document, "createElement").mockReturnValue({
      getContext: () => null,
    } as unknown as HTMLCanvasElement);

    const supportsWebgl = await loadSupportsWebgl();
    expect(supportsWebgl()).toBe(false);
  });

  it("returns false when getContext throws", async () => {
    jest.spyOn(document, "createElement").mockReturnValue({
      getContext: () => {
        throw new Error("boom");
      },
    } as unknown as HTMLCanvasElement);

    const supportsWebgl = await loadSupportsWebgl();
    expect(supportsWebgl()).toBe(false);
  });
});
