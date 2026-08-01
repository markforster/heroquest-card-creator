import { normalizeInspectorColor } from "@/components/Cards/CardInspector/card-inspector-color-utils";

const options = { defaultColor: "#FFFFFF", transparentValue: "transparent" };

describe("normalizeInspectorColor", () => {
  it("preserves transparency, normalizes hex, and falls back to the default", () => {
    expect(normalizeInspectorColor("transparent", options)).toBe("transparent");
    expect(normalizeInspectorColor("#abc", options)).toBe("#AABBCC");
    expect(normalizeInspectorColor("invalid", options)).toBe("#FFFFFF");
  });
});
