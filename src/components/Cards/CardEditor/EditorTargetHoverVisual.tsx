"use client";

import type { CSSProperties, SVGProps } from "react";
import { ENABLE_EDITOR_TARGET_INTERACTIONS } from "@/config/flags";
import type { BlueprintBounds } from "@/types/blueprints";

import * as EditorTargetsContext from "./EditorTargetsContext";
import type { EditorTargetId, HoverAdornmentDescriptor } from "./EditorTargetsContext";

const HOVER_STYLE: CSSProperties = {
  pointerEvents: "none",
  transition: "opacity 250ms ease-out",
};

const HOVER_FILTER =
  "drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.28))";

type HoverVisualProps = {
  targetId: EditorTargetId;
  visible: boolean;
};

type HoverRectProps = HoverVisualProps &
  BlueprintBounds & {
    radius?: number;
  } & Omit<SVGProps<SVGRectElement>, "x" | "y" | "width" | "height" | "style">;

type HoverPathProps = HoverVisualProps & {
  d: string;
} & Omit<SVGProps<SVGPathElement>, "d" | "style">;

export function getEditorTargetHoverStyle(visible: boolean): CSSProperties {
  return {
    ...HOVER_STYLE,
    opacity: visible ? 1 : 0,
    filter: HOVER_FILTER,
  };
}

export function padBounds(bounds: BlueprintBounds, padding: number): BlueprintBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function EditorTargetHoverRect({
  targetId,
  visible,
  x,
  y,
  width,
  height,
  radius = 12,
  ...rest
}: HoverRectProps) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={radius}
      ry={radius}
      fill="rgba(255, 255, 255, 0.08)"
      stroke="rgba(255, 255, 255, 0.52)"
      strokeWidth={2}
      data-hqcc-hover-target={targetId}
      data-hqcc-hover-visible={visible ? "true" : "false"}
      style={getEditorTargetHoverStyle(visible)}
      {...rest}
    />
  );
}

export function EditorTargetHoverPath({ targetId, visible, d, ...rest }: HoverPathProps) {
  return (
    <path
      d={d}
      fill="rgba(255, 255, 255, 0.08)"
      stroke="rgba(255, 255, 255, 0.52)"
      strokeWidth={2}
      strokeLinejoin="round"
      data-hqcc-hover-target={targetId}
      data-hqcc-hover-visible={visible ? "true" : "false"}
      style={getEditorTargetHoverStyle(visible)}
      {...rest}
    />
  );
}

export function HoverAdornmentDescriptorShape({
  targetId,
  visible,
  descriptor,
}: {
  targetId: EditorTargetId;
  visible: boolean;
  descriptor: HoverAdornmentDescriptor;
}) {
  if (descriptor.kind === "path") {
    return <EditorTargetHoverPath targetId={targetId} visible={visible} d={descriptor.d} />;
  }

  return (
    <EditorTargetHoverRect
      targetId={targetId}
      visible={visible}
      x={descriptor.x}
      y={descriptor.y}
      width={descriptor.width}
      height={descriptor.height}
      radius={descriptor.radius}
    />
  );
}

export function EditorTargetAdornmentLayer() {
  if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return null;

  const editorTargets =
    typeof EditorTargetsContext.useOptionalEditorTargets === "function"
      ? EditorTargetsContext.useOptionalEditorTargets()
      : EditorTargetsContext.useEditorTargets();

  if (!editorTargets) return null;

  const { hoveredTargetId, hoverAdornmentDescriptor } = editorTargets;

  if (!hoveredTargetId || !hoverAdornmentDescriptor) return null;

  return (
    <g data-hqcc-hover-overlay="true" pointerEvents="none">
      <HoverAdornmentDescriptorShape
        targetId={hoveredTargetId}
        visible={true}
        descriptor={hoverAdornmentDescriptor}
      />
    </g>
  );
}
