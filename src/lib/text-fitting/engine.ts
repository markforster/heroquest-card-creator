import type { PreferencesByRole, TextBounds, TextLayoutResult, TextRole } from "./types";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import { ROLE_CONFIG, type StrategyId } from "./roleConfig";
import { ellipsisStrategy, hyphenateStrategy, shrinkStrategy, wrapStrategy } from "./strategies";
import { createTextMeasurer } from "./measure";
import { statHeadingAlgorithm, titleAlgorithm } from "./algorithms";

export type EngineResult = {
  layout: TextLayoutResult;
  attempts?: TextLayoutResult[];
};

function fitsWithinBounds(
  layout: TextLayoutResult,
  bounds: TextBounds,
  fontFamily: string,
  fontWeight?: number | string,
): boolean {
  const lineHeight = layout.lineHeight ?? layout.fontSize * 1.05;
  const totalHeight = Math.max(1, layout.lines.length) * lineHeight;
  if (totalHeight > bounds.height) return false;
  const measure = createTextMeasurer(layout.fontSize, fontFamily, fontWeight);
  const maxLineWidth = layout.lines.reduce((max, line) => Math.max(max, measure(line)), 0);
  return maxLineWidth <= bounds.width;
}

function runStrategyPipeline(
  baseLayout: TextLayoutResult,
  bounds: TextBounds,
  orderedStrategies: StrategyId[],
  minFontPercent?: number,
  twoLineMinPercent?: number,
  allowWrap?: boolean,
  forceTwoLine?: boolean,
): EngineResult {
  const defaultFontWeight = baseLayout.role === "statHeading" ? 700 : 550;
  const fontFamily = CARD_TEXT_FONT_FAMILY;
  let context = {
    role: baseLayout.role,
    text: baseLayout.lines.join(" "),
    bounds,
    fontSize: baseLayout.fontSize,
    lineHeight: baseLayout.lineHeight ?? baseLayout.fontSize * 1.05,
    lines: baseLayout.lines,
    fontFamily,
    fontWeight: defaultFontWeight,
    minFontPercent,
    twoLineMinPercent,
    allowWrap,
    forceTwoLine,
  };
  const attempts: TextLayoutResult[] = [baseLayout];

  for (const strategy of orderedStrategies) {
    if (strategy === "wrap") {
      const result = wrapStrategy(context);
      attempts.push(result.layout);
      context = {
        ...context,
        fontSize: result.layout.fontSize,
        lineHeight: result.layout.lineHeight ?? context.lineHeight,
        lines: result.layout.lines,
      };
      if (context.role === "statHeading" && fitsWithinBounds(result.layout, bounds, fontFamily, context.fontWeight)) {
        return { layout: result.layout, attempts };
      }
      if (result.success && context.role !== "statHeading") return { layout: result.layout, attempts };
    }

    if (strategy === "shrink") {
      const result = shrinkStrategy(context);
      attempts.push(result.layout);
      context = {
        ...context,
        fontSize: result.layout.fontSize,
        lineHeight: result.layout.lineHeight ?? context.lineHeight,
        lines: result.layout.lines,
      };
      if (result.success && context.role !== "statHeading") return { layout: result.layout, attempts };
    }

    if (strategy === "ellipsis") {
      const result = ellipsisStrategy(context);
      attempts.push(result.layout);
      if (result.success) return { layout: result.layout, attempts };
    }

    if (strategy === "hyphenate") {
      const result = hyphenateStrategy(context);
      attempts.push(result.layout);
      context = {
        ...context,
        fontSize: result.layout.fontSize,
        lineHeight: result.layout.lineHeight ?? context.lineHeight,
        lines: result.layout.lines,
      };
      if (context.role === "statHeading" && fitsWithinBounds(result.layout, bounds)) {
        return { layout: result.layout, attempts };
      }
      if (context.role !== "statHeading") {
        return { layout: result.layout, attempts };
      }
    }
  }

  return { layout: attempts[attempts.length - 1], attempts };
}

export function fitTextWithEngine(
  role: TextRole,
  text: string,
  bounds: TextBounds,
  preferences?: PreferencesByRole[TextRole],
): EngineResult {
  const roleDefaults = ROLE_CONFIG[role];
  const resolvedPreferences = {
    ...roleDefaults.defaultPreferences,
    ...(preferences ?? {}),
  };
  const orderedStrategies = (() => {
    if (!resolvedPreferences.preferEllipsis) {
      return roleDefaults.defaultStrategies;
    }
    const base = roleDefaults.defaultStrategies.filter((id) => id !== "ellipsis");
    const shrinkIndex = base.indexOf("shrink");
    if (shrinkIndex >= 0) {
      base.splice(shrinkIndex, 0, "ellipsis");
      return base;
    }
    return ["ellipsis", ...base];
  })();
  const layout = role === "title" ? titleAlgorithm(text) : statHeadingAlgorithm(text, bounds);
  return runStrategyPipeline(
    layout,
    bounds,
    orderedStrategies,
    resolvedPreferences.minFontPercent,
    resolvedPreferences.twoLineMinPercent,
    resolvedPreferences.allowWrap,
    resolvedPreferences.forceTwoLine,
  );
}
