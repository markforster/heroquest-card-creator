import { fitTextWithEngine } from "./engine";

import type { PreferencesByRole, TextBounds, TextLayoutResult, TextRole } from "./types";

export default function fitText(
  role: TextRole,
  text: string,
  bounds: TextBounds,
  preferences?: PreferencesByRole[TextRole],
): TextLayoutResult {
  return fitTextWithEngine(role, text, bounds, preferences).layout;
}
