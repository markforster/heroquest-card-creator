import { splitFilename } from "@/lib/asset-filename";

describe("splitFilename", () => {
  it("splits a normal filename with extension", () => {
    expect(splitFilename("image.png")).toEqual({ base: "image", extension: ".png" });
  });

  it("uses the last dot for multi-dot filenames", () => {
    expect(splitFilename("archive.tar.gz")).toEqual({ base: "archive.tar", extension: ".gz" });
  });

  it("treats dotfiles as having no extension", () => {
    expect(splitFilename(".env")).toEqual({ base: ".env", extension: "" });
  });

  it("returns empty extension when there is no dot", () => {
    expect(splitFilename("noext")).toEqual({ base: "noext", extension: "" });
  });

  it("returns '.' as the extension for trailing dots", () => {
    expect(splitFilename("trailing.")).toEqual({ base: "trailing", extension: "." });
  });
});
