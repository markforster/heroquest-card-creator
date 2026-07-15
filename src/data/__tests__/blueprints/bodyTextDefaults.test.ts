import { blueprintIds } from "@/data/card-systems/types";
import { blueprintsByTemplateId } from "@/data/blueprints";

function getGroupChildProps(templateId: "hero" | "monster", childId: string) {
  const blueprint = blueprintsByTemplateId[templateId];
  const child = blueprint?.groups?.flatMap((group) => group.children).find((entry) => entry.id === childId);
  return child?.props;
}

describe("body text blueprint defaults", () => {
  it("does not default hero body text to bold below the stats stack", () => {
    const props = getGroupChildProps("hero", blueprintIds.hq_2021_text_body);

    expect(props).toBeDefined();
    expect(props?.fontWeight).toBeUndefined();
  });

  it("does not default monster body text to bold below the stats stack", () => {
    const props = getGroupChildProps("monster", blueprintIds.hq_2021_text_body);

    expect(props).toBeDefined();
    expect(props?.fontWeight).toBeUndefined();
  });
});
