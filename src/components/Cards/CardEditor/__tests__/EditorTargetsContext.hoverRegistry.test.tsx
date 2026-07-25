"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
  useRegisterHoverAdornment,
} from "@/components/Cards/CardEditor/EditorTargetsContext";

function HoverDescriptorProbe() {
  const { hoveredTargetId, hoverAdornmentDescriptor, setHoveredTargetId } = useEditorTargets();

  useEffect(() => {
    setHoveredTargetId(EDITOR_TARGET_IDS.title);
    return () => {
      setHoveredTargetId(null);
    };
  }, [setHoveredTargetId]);

  const rectDescriptor =
    hoverAdornmentDescriptor && hoverAdornmentDescriptor.kind === "rect"
      ? hoverAdornmentDescriptor
      : null;

  return (
    <>
      <output data-testid="hovered-target">{hoveredTargetId ?? "none"}</output>
      <output data-testid="hover-x">{rectDescriptor?.x ?? "none"}</output>
    </>
  );
}

function HoverAdornmentRegistration({
  x,
}: {
  x: number;
}) {
  useRegisterHoverAdornment(EDITOR_TARGET_IDS.title, {
    kind: "rect",
    x,
    y: 10,
    width: 100,
    height: 40,
    radius: 12,
  });

  return null;
}

function Harness() {
  const [showTopRegistration, setShowTopRegistration] = useState(true);

  return (
    <EditorTargetsProvider>
      <HoverDescriptorProbe />
      <HoverAdornmentRegistration x={10} />
      {showTopRegistration ? <HoverAdornmentRegistration x={40} /> : null}
      <button type="button" onClick={() => setShowTopRegistration(false)}>
        remove-top
      </button>
    </EditorTargetsProvider>
  );
}

describe("EditorTargetsContext hover registry", () => {
  it("restores the previous hover descriptor when a later registration unmounts", () => {
    render(<Harness />);

    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.title);
    expect(screen.getByTestId("hover-x")).toHaveTextContent("40");

    fireEvent.click(screen.getByRole("button", { name: "remove-top" }));

    expect(screen.getByTestId("hover-x")).toHaveTextContent("10");
  });
});
