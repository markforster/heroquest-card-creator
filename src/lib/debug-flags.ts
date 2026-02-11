export function isTextBoundsDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("hqcc.debugTextBounds") === "1";
  } catch {
    return false;
  }
}
