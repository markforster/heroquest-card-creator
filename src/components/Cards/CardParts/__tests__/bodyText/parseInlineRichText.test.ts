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

  it("parses numeric scale tags and nested scale combinations", () => {
    expect(parseInlineRichText('<scale="1.25">Big</scale> <scale=1.5><scale=0.5>Mix</scale></scale>')).toEqual([
      { text: "Big", scale: 1.25 },
      { text: " " },
      { text: "Mix", scale: 0.75 },
    ]);
  });

  it("accepts sc as a scale alias", () => {
    expect(parseInlineRichText("<sc=1.25>Big</sc>")).toEqual([{ text: "Big", scale: 1.25 }]);
  });

  it("clamps out-of-range scale values and ignores malformed scale tags", () => {
    expect(parseInlineRichText("<scale=2>Huge</scale> <scale=oops>Broken</scale>")).toEqual([
      { text: "Huge", scale: 1.5 },
      { text: " " },
      { text: "Broken" },
    ]);
  });

  it("leaves unsupported tags as literal text", () => {
    expect(parseInlineRichText("Use <foo>plain</foo> text")).toEqual([
      { text: "Use <foo>plain</foo> text" },
    ]);
  });
});
