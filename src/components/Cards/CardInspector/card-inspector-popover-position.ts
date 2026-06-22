export type CardInspectorPopoverPosition = {
  left: number;
  top: number;
  width: number;
};

export type CardInspectorPopoverPositionOptions = {
  padding?: number;
  offset?: number;
  minWidth?: number;
  maxWidth?: number;
  viewportHeight?: number;
};

export function computeCardInspectorPopoverPosition(
  anchor: HTMLElement | null,
  popover: HTMLElement | null,
  options: CardInspectorPopoverPositionOptions = {},
): CardInspectorPopoverPosition | null {
  if (!anchor || !popover) return null;

  const {
    padding = 12,
    offset = 8,
    minWidth = 240,
    maxWidth = 520,
    viewportHeight = window.innerHeight,
  } = options;

  const anchorRect = anchor.getBoundingClientRect();
  const spaceLeft = anchorRect.left - padding - offset;
  const width = Math.max(minWidth, Math.min(maxWidth, spaceLeft));

  popover.style.width = `${width}px`;

  const { width: measuredWidth, height } = popover.getBoundingClientRect();
  const left = Math.max(anchorRect.left - measuredWidth - offset, padding);
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const top = Math.min(
    Math.max(anchorCenterY, padding + height / 2),
    viewportHeight - padding - height / 2,
  );

  return { left, top, width };
}
