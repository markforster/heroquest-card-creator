"use client";

const PREVIEW_SELECTION_PRESERVE_SELECTOR = [
  "[data-hqcc-edit]",
  '[data-editor-overlay="true"]',
].join(", ");

export function shouldClearPreviewSelection(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return true;
  }

  return target.closest(PREVIEW_SELECTION_PRESERVE_SELECTOR) == null;
}
