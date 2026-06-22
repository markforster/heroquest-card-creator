import type { InlineTextStyle, TextRun } from "./types";

type StyleScope = {
  tag: "b" | "i" | "u" | "color";
  style: InlineTextStyle;
};

type TagParseResult =
  | { kind: "open"; scope: StyleScope }
  | { kind: "close"; tag: StyleScope["tag"] }
  | { kind: "invalid" };

export default function parseInlineRichText(line: string): TextRun[] {
  const runs: TextRun[] = [];
  const scopes: StyleScope[] = [];
  let buffer = "";
  let index = 0;

  const flushBuffer = () => {
    if (!buffer) return;
    runs.push({ text: buffer, ...resolveStyle(scopes) });
    buffer = "";
  };

  while (index < line.length) {
    const richTag = readRichTextTag(line, index);
    if (richTag) {
      const parsed = parseRichTag(richTag.raw);
      if (parsed.kind !== "invalid") {
        flushBuffer();
        if (parsed.kind === "open") {
          scopes.push(parsed.scope);
        } else {
          closeScope(scopes, parsed.tag);
        }
        index = richTag.nextIndex;
        continue;
      }
    }

    const emphasis = readMarkdownEmphasis(line, index);
    if (emphasis) {
      flushBuffer();
      runs.push(...applyMarkdownRuns(emphasis.content, resolveStyle(scopes), emphasis.style));
      index = emphasis.nextIndex;
      continue;
    }

    buffer += line[index];
    index += 1;
  }

  flushBuffer();

  return runs;
}

function resolveStyle(scopes: StyleScope[]): InlineTextStyle {
  return scopes.reduce<InlineTextStyle>((acc, scope) => ({ ...acc, ...scope.style }), {});
}

function closeScope(scopes: StyleScope[], tag: StyleScope["tag"]) {
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    if (scopes[i].tag === tag) {
      scopes.splice(i, 1);
      return;
    }
  }
}

function readRichTextTag(line: string, start: number): { raw: string; nextIndex: number } | null {
  if (line[start] !== "<") return null;
  const end = line.indexOf(">", start + 1);
  if (end < 0) return null;
  return {
    raw: line.slice(start, end + 1),
    nextIndex: end + 1,
  };
}

function parseRichTag(raw: string): TagParseResult {
  const trimmed = raw.trim();

  if (/^<\/b>$/i.test(trimmed)) return { kind: "close", tag: "b" };
  if (/^<\/i>$/i.test(trimmed)) return { kind: "close", tag: "i" };
  if (/^<\/u>$/i.test(trimmed)) return { kind: "close", tag: "u" };
  if (/^<\/color>$/i.test(trimmed)) return { kind: "close", tag: "color" };

  if (/^<b>$/i.test(trimmed)) return { kind: "open", scope: { tag: "b", style: { bold: true } } };
  if (/^<i>$/i.test(trimmed)) return { kind: "open", scope: { tag: "i", style: { italic: true } } };
  if (/^<u>$/i.test(trimmed))
    return { kind: "open", scope: { tag: "u", style: { underline: true } } };

  const shorthandMatch = trimmed.match(/^<\s*(#[0-9a-fA-F]{3,8})\s*>$/);
  if (shorthandMatch) {
    return {
      kind: "open",
      scope: { tag: "color", style: { color: normalizeColor(shorthandMatch[1]) } },
    };
  }

  const colorMatch = trimmed.match(
    /^<\s*color\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))\s*>$/i,
  );
  if (colorMatch) {
    const rawValue = colorMatch[1] ?? colorMatch[2] ?? colorMatch[3];
    const color = normalizeColor(rawValue);
    if (!color) return { kind: "invalid" };
    return {
      kind: "open",
      scope: { tag: "color", style: { color } },
    };
  }

  return { kind: "invalid" };
}

function normalizeColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed.toLowerCase();
  return undefined;
}

function readMarkdownEmphasis(
  line: string,
  start: number,
):
  | {
      content: string;
      nextIndex: number;
      style: InlineTextStyle;
    }
  | null {
  if (line[start] !== "*") return null;

  const options: Array<{ marker: string; style: InlineTextStyle }> = [
    { marker: "***", style: { bold: true, italic: true } },
    { marker: "**", style: { bold: true } },
    { marker: "*", style: { italic: true } },
  ];

  for (const option of options) {
    if (!line.startsWith(option.marker, start)) continue;
    const end = line.indexOf(option.marker, start + option.marker.length);
    if (end < 0) continue;

    const content = line.slice(start + option.marker.length, end);
    if (!content.trim()) continue;
    if (content.startsWith(" ") || content.endsWith(" ")) continue;

    return {
      content,
      nextIndex: end + option.marker.length,
      style: option.style,
    };
  }

  return null;
}

function applyMarkdownRuns(
  content: string,
  baseStyle: InlineTextStyle,
  emphasisStyle: InlineTextStyle,
): TextRun[] {
  const nestedRuns = parseInlineRichText(content);
  return nestedRuns.map((run) => ({
    ...run,
    ...baseStyle,
    bold: emphasisStyle.bold || run.bold || baseStyle.bold,
    italic: emphasisStyle.italic || run.italic || baseStyle.italic,
    underline: run.underline ?? baseStyle.underline,
    color: run.color ?? baseStyle.color,
  }));
}
