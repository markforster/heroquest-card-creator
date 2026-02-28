"use client";

import { useEffect, useState } from "react";

type UsePopoverPlacementArgs = {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  popoverRef: React.RefObject<HTMLElement>;
  padding?: number;
  offset?: number;
};

export function usePopoverPlacement({
  isOpen,
  anchorRef,
  popoverRef,
  padding = 12,
  offset = 0,
}: UsePopoverPlacementArgs) {
  const [placement, setPlacement] = useState<"down" | "up">("down");

  useEffect(() => {
    if (!isOpen) return;

    const updatePlacement = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const spaceBelow = window.innerHeight - anchorRect.bottom - padding;
      const needsFlip = popoverRect.height + padding + offset > spaceBelow;
      setPlacement(needsFlip ? "up" : "down");
    };

    const raf = window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [anchorRef, isOpen, offset, padding, popoverRef]);

  return placement;
}
