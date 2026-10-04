import { classifyListLine } from "../../bodyText/listSyntax";

describe("classifyListLine", () => {
  it.each([
    "- One",
    "-    Four",
    "0. Zero",
    "0003. Three",
    "999999999. Nine",
    "  - Child",
    "  1. Child",
  ])("accepts %s", (text) => {
    expect(classifyListLine(text)?.kind).toBe("item");
  });
  it.each([
    "+ No",
    "* No",
    "-- No",
    "-No",
    "1) No",
    "1.No",
    "-",
    "1.",
    "-    ",
    "-     Five",
    " - One",
    "   - Three",
    "    - Four",
    "\t- Tab",
    "-\tTab",
    "- \tTab",
    "1000000000. Ten",
    "- - -",
    "- * *",
    "- _ _",
    "<ul><li>No</li></ul>",
  ])("leaves %s literal", (text) => {
    expect(classifyListLine(text)).toBeNull();
  });
  it("keeps content spacing and recognizes targeted escapes only", () => {
    expect(classifyListLine("  03. Text  ")).toMatchObject({
      depth: 1,
      sourceNumber: 3,
      content: "Text  ",
    });
    expect(classifyListLine("\\- Text")).toEqual({ kind: "escaped", text: "- Text" });
    expect(classifyListLine("  \\1. Text")).toEqual({ kind: "escaped", text: "  1. Text" });
    expect(classifyListLine("\\\\- Text")).toBeNull();
    expect(classifyListLine("\\-No")).toBeNull();
  });
});
