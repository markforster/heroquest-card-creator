import { runsToTokens, wrapTokens } from "@/lib/text-fitting/wrap";

describe("wrapTokens (inline style)", () => {
  it("preserves underline and color when coalescing wrapped text tokens", () => {
    const tokens = runsToTokens([
      { text: "Alpha Beta", underline: true, color: "#ff0000" },
      { text: " Gamma", underline: true, color: "#ff0000" },
    ]);

    const measure = (text: string) => text.length * 10;
    const lines = wrapTokens(tokens, 55, measure);

    expect(lines[0]).toEqual([
      {
        kind: "text",
        text: "Alpha ",
        bold: undefined,
        italic: undefined,
        underline: true,
        color: "#ff0000",
      },
    ]);
    expect(lines[1]).toEqual([
      {
        kind: "text",
        text: "Beta ",
        bold: undefined,
        italic: undefined,
        underline: true,
        color: "#ff0000",
      },
    ]);
    expect(lines[2]).toEqual([
      {
        kind: "text",
        text: "Gamma",
        bold: undefined,
        italic: undefined,
        underline: true,
        color: "#ff0000",
      },
    ]);
  });
});
