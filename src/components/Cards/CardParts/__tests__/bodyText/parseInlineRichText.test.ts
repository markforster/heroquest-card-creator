import parseInlineRichText from "@/components/Cards/CardParts/bodyText/parseInlineRichText";

describe("parseInlineRichText", () => {
  it("parses markdown emphasis and TMP-style tags into one run model", () => {
    expect(parseInlineRichText("Start **bold** <u>under</u> <color=#ff0000>red</color>")).toEqual([
      { text: "Start " },
      { text: "bold", bold: true },
      { text: " " },
      { text: "under", underline: true },
      { text: " " },
      { text: "red", color: "#ff0000" },
    ]);
  });

  it("merges nested emphasis with scoped tag styles", () => {
    expect(parseInlineRichText("<color=#00ff00>***bright***</color>")).toEqual([
      { text: "bright", bold: true, italic: true, color: "#00ff00" },
    ]);
  });

  it("leaves unsupported tags as literal text", () => {
    expect(parseInlineRichText("Use <foo>plain</foo> text")).toEqual([
      { text: "Use <foo>plain</foo> text" },
    ]);
  });
});
