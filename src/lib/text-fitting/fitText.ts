import type { PreferencesByRole, TextBounds, TextLayoutResult, TextRole } from "./types";
import { fitTextWithEngine } from "./engine";

export default function fitText(
  role: TextRole,
  text: string,
  bounds: TextBounds,
  preferences?: PreferencesByRole[TextRole],
): TextLayoutResult {
  return fitTextWithEngine(role, text, bounds, preferences).layout;
}
