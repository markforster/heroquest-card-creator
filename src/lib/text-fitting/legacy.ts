import { wrapStatHeadingWithBreakpoints } from "./statHeadingBreakpoints";

export function wrapHeaderLinesApprox(text: string, maxWidth: number, fontSize: number): string[] {
  const approxCharWidth = fontSize * 0.6;
  return wrapStatHeadingWithBreakpoints(text, maxWidth, (value) => value.length * approxCharWidth);
}
