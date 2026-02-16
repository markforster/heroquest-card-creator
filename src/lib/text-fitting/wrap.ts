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

    if (!isWhitespace && tokenWidth > maxWidth) {
      if (currentTokens.length > 0) {
        lines.push(coalesceTokens(currentTokens));
        currentTokens = [];
        currentWidth = 0;
      }
      const splitRuns = splitTokenToRuns(token, maxWidth, measure);
      splitRuns.forEach((run, index) => {
        const runWidth = measure(run.text);
        const isLast = index === splitRuns.length - 1;
        if (!isLast) {
          lines.push([run]);
        } else {
          currentTokens = [{ text: run.text, bold: run.bold, italic: run.italic }];
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

function splitTokenToRuns(token: Token, maxWidth: number, measure: (text: string) => number): TextRun[] {
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
      if (measure(candidateWithHyphen) <= maxWidth) {
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
