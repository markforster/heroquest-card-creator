import type { InlineDiceToken } from "@/lib/inline-dice";

type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type WrapToken =
  | {
      kind: "text";
      text: string;
      bold?: boolean;
      italic?: boolean;
    }
  | {
      kind: "dice";
      dice: InlineDiceToken;
      width: number;
      renderSize: number;
    };

export function runsToTokens(runs: TextRun[]): WrapToken[] {
  const tokens: WrapToken[] = [];

  runs.forEach((run) => {
    const parts = run.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      tokens.push({
        kind: "text",
        text: part,
        bold: run.bold,
        italic: run.italic,
      });
    });
  });

  return tokens;
}

export function wrapTokens(
  tokens: WrapToken[],
  maxWidth: number,
  measure: (text: string, token?: Extract<WrapToken, { kind: "text" }>) => number,
): WrapToken[][] {
  const lines: WrapToken[][] = [];
  let currentTokens: WrapToken[] = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
    if (token.kind === "dice") {
      const tokenWidth = token.width;
      if (currentTokens.length > 0 && currentWidth + tokenWidth > maxWidth) {
        lines.push(coalesceTokens(currentTokens));
        currentTokens = [];
        currentWidth = 0;
      }

      currentTokens.push(token);
      currentWidth += tokenWidth;
      return;
    }

    const tokenWidth = measure(token.text, token);
    const isWhitespace = token.text.trim().length === 0;

    if (!isWhitespace && tokenWidth > maxWidth) {
      if (currentTokens.length > 0) {
        lines.push(coalesceTokens(currentTokens));
        currentTokens = [];
        currentWidth = 0;
      }
      const splitRuns = splitTokenToRuns(token, maxWidth, measure);
      splitRuns.forEach((run, index) => {
        const runWidth = measure(run.text, token);
        const isLast = index === splitRuns.length - 1;
        if (!isLast) {
          lines.push([{ kind: "text", ...run }]);
        } else {
          currentTokens = [{ kind: "text", text: run.text, bold: run.bold, italic: run.italic }];
          currentWidth = runWidth;
        }
      });
      return;
    }

    if (currentTokens.length > 0 && !isWhitespace && currentWidth + tokenWidth > maxWidth) {
      if (currentTokens.length > 0) {
        lines.push(coalesceTokens(currentTokens));
      }
      currentTokens = [];
      currentWidth = 0;
    }

    currentTokens.push(token);
    currentWidth += tokenWidth;
  });

  if (currentTokens.length > 0) {
    lines.push(coalesceTokens(currentTokens));
  }

  return lines;
}

function splitTokenToRuns(
  token: Extract<WrapToken, { kind: "text" }>,
  maxWidth: number,
  measure: (text: string, token?: Extract<WrapToken, { kind: "text" }>) => number,
): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = token.text;

  while (remaining.length > 0) {
    let chunk = "";
    let nextIndex = 0;
    const isFinalChunk = remaining.length <= 1;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining.slice(0, i + 1);
      const candidateWithHyphen =
        i < remaining.length - 1 ? `${candidate}-` : candidate;
      if (measure(candidateWithHyphen, token) <= maxWidth) {
        chunk = candidate;
        nextIndex = i + 1;
      } else {
        break;
      }
    }

    if (!chunk) {
      chunk = remaining[0];
      nextIndex = 1;
    }

    remaining = remaining.slice(nextIndex);
    const needsHyphen = remaining.length > 0;
    runs.push({
      text: needsHyphen ? `${chunk}-` : chunk,
      bold: token.bold,
      italic: token.italic,
    });

    if (isFinalChunk) {
      break;
    }
  }

  return runs;
}

function coalesceTokens(tokens: WrapToken[]): WrapToken[] {
  const merged: WrapToken[] = [];
  let current: Extract<WrapToken, { kind: "text" }> | null = null;

  tokens.forEach((token) => {
    if (token.kind === "dice") {
      if (current) {
        merged.push(current);
        current = null;
      }
      merged.push(token);
      return;
    }

    if (!current) {
      current = { kind: "text", text: token.text, bold: token.bold, italic: token.italic };
      return;
    }

    if (current.bold === token.bold && current.italic === token.italic) {
      current.text += token.text;
    } else {
      merged.push(current);
      current = { kind: "text", text: token.text, bold: token.bold, italic: token.italic };
    }
  });

  if (current) {
    merged.push(current);
  }

  return merged;
}
