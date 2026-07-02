"use client";

import { useEffect, useRef, useState } from "react";
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
const HOVER_FILL = "rgba(255, 255, 255, 0.08)";
const HOVER_STROKE = "rgba(255, 255, 255, 0.9)";
const HOVER_STROKE_WIDTH = 3.5;
const HOVER_FADE_MS = 250;

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
      fill={HOVER_FILL}
      stroke={HOVER_STROKE}
      strokeWidth={HOVER_STROKE_WIDTH}
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
      fill={HOVER_FILL}
      stroke={HOVER_STROKE}
      strokeWidth={HOVER_STROKE_WIDTH}
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
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [renderedTargetId, setRenderedTargetId] = useState<EditorTargetId | null>(null);
  const [renderedDescriptor, setRenderedDescriptor] = useState<HoverAdornmentDescriptor | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (hoveredTargetId && hoverAdornmentDescriptor) {
      const isSameTarget =
        renderedTargetId === hoveredTargetId &&
        renderedDescriptor === hoverAdornmentDescriptor;

      setRenderedTargetId(hoveredTargetId);
      setRenderedDescriptor(hoverAdornmentDescriptor);

      if (isSameTarget) {
        setVisible(true);
        return;
      }

      setVisible(false);
      rafRef.current = requestAnimationFrame(() => {
        setVisible(true);
        rafRef.current = null;
      });
      return;
    }

    if (!renderedTargetId || !renderedDescriptor) return;

    setVisible(false);
    fadeTimeoutRef.current = setTimeout(() => {
      setRenderedTargetId(null);
      setRenderedDescriptor(null);
      fadeTimeoutRef.current = null;
    }, HOVER_FADE_MS);
  }, [hoveredTargetId, hoverAdornmentDescriptor, renderedTargetId, renderedDescriptor]);

  if (!renderedTargetId || !renderedDescriptor) return null;

  return (
    <g data-hqcc-hover-overlay="true" pointerEvents="none">
      <HoverAdornmentDescriptorShape
        targetId={renderedTargetId}
        visible={visible}
        descriptor={renderedDescriptor}
      />
    </g>
  );
}
