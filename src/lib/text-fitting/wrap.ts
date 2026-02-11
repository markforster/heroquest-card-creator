type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type Token = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export function runsToTokens(runs: TextRun[]): Token[] {
  const tokens: Token[] = [];

  runs.forEach((run) => {
    const parts = run.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      tokens.push({
        text: part,
        bold: run.bold,
        italic: run.italic,
      });
    });
  });

  return tokens;
}

export function wrapTokens(tokens: Token[], maxWidth: number, measure: (text: string) => number): TextRun[][] {
  const lines: TextRun[][] = [];
  let currentTokens: Token[] = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
    const tokenWidth = measure(token.text);
    const isWhitespace = token.text.trim().length === 0;

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

function coalesceTokens(tokens: Token[]): TextRun[] {
  const runs: TextRun[] = [];
  let current: TextRun | null = null;

  tokens.forEach((token) => {
    if (!current) {
      current = {
        text: token.text,
        bold: token.bold,
        italic: token.italic,
      };
      return;
    }

    if (current.bold === token.bold && current.italic === token.italic) {
      current.text += token.text;
    } else {
      runs.push(current);
      current = {
        text: token.text,
        bold: token.bold,
        italic: token.italic,
      };
    }
  });

  if (current) {
    runs.push(current);
  }

  return runs;
}
