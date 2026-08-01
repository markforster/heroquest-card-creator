import { hasInspectorColorRevert } from "@/components/Cards/CardInspector/card-inspector-color-utils";

const options = { defaultColor: "#FFFFFF", transparentValue: "transparent" };

describe("hasInspectorColorRevert", () => {
  it("compares normalized current and saved colors", () => {
    expect(hasInspectorColorRevert("#abc", "#AABBCC", options)).toBe(false);
    expect(hasInspectorColorRevert("#000000", undefined, options)).toBe(true);
  });
});
