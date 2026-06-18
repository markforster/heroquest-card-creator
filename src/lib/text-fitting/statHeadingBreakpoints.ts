export type StatHeadingBreakpointType = "none" | "space" | "hyphen";

type StatHeadingToken = {
  text: string;
  separatorAfter: "" | " ";
  breakpointAfter: StatHeadingBreakpointType;
};

type BestTwoLineCandidate = {
  left: string;
  right: string;
  breakpoint: Exclude<StatHeadingBreakpointType, "none">;
  maxWidth: number;
  balance: number;
};

function createToken(
  text: string,
  breakpointAfter: StatHeadingBreakpointType,
): StatHeadingToken {
  return {
    text,
    separatorAfter: breakpointAfter === "space" ? " " : "",
    breakpointAfter,
  };
}

function buildLine(tokens: StatHeadingToken[], start: number, end: number): string {
  if (start >= end) return "";

  let line = tokens[start].text;
  for (let index = start + 1; index < end; index += 1) {
    line += `${tokens[index - 1].separatorAfter}${tokens[index].text}`;
  }

  return line;
}

function compareCandidate(
  next: BestTwoLineCandidate,
  current: BestTwoLineCandidate | null,
): BestTwoLineCandidate {
  if (!current) return next;

  const nextPenalty = next.breakpoint === "hyphen" ? 0 : 1;
  const currentPenalty = current.breakpoint === "hyphen" ? 0 : 1;

  if (nextPenalty !== currentPenalty) {
    return nextPenalty < currentPenalty ? next : current;
  }

  if (next.maxWidth !== current.maxWidth) {
    return next.maxWidth < current.maxWidth ? next : current;
  }

  if (next.balance !== current.balance) {
    return next.balance < current.balance ? next : current;
  }

  return next.left.length < current.left.length ? next : current;
}

export function tokenizeStatHeadingBreakpoints(text: string): StatHeadingToken[] {
  const tokens: StatHeadingToken[] = [];
  let buffer = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === " ") {
      if (buffer) {
        tokens.push(createToken(buffer, "space"));
        buffer = "";
      }
      continue;
    }

    buffer += char;

    if (char === "-") {
      tokens.push(createToken(buffer, "hyphen"));
      buffer = "";
    }
  }

  if (buffer) {
    tokens.push(createToken(buffer, "none"));
  } else if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];
    tokens[tokens.length - 1] = createToken(lastToken.text, "none");
  }

  return tokens;
}

export function wrapStatHeadingWithBreakpoints(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const tokens = tokenizeStatHeadingBreakpoints(text);
  if (tokens.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let lineStart = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const candidate = buildLine(tokens, lineStart, index + 1);
    const candidateWidth = measure(candidate);

    if (lineStart === index || candidateWidth <= maxWidth) {
      continue;
    }

    lines.push(buildLine(tokens, lineStart, index));
    lineStart = index;
  }

  lines.push(buildLine(tokens, lineStart, tokens.length));
  return lines;
}

export function findBestStatHeadingTwoLineBreak(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): { left: string; right: string; breakpoint: "space" | "hyphen" } | null {
  const tokens = tokenizeStatHeadingBreakpoints(text);
  if (tokens.length < 2) {
    return null;
  }

  let best: BestTwoLineCandidate | null = null;

  for (let index = 1; index < tokens.length; index += 1) {
    const breakpoint = tokens[index - 1].breakpointAfter;
    if (breakpoint === "none") continue;

    const left = buildLine(tokens, 0, index);
    const right = buildLine(tokens, index, tokens.length);
    const leftWidth = measure(left);
    const rightWidth = measure(right);

    if (leftWidth > maxWidth || rightWidth > maxWidth) {
      continue;
    }

    best = compareCandidate(
      {
        left,
        right,
        breakpoint,
        maxWidth: Math.max(leftWidth, rightWidth),
        balance: Math.abs(leftWidth - rightWidth),
      },
      best,
    );
  }

  if (!best) {
    return null;
  }

  return {
    left: best.left,
    right: best.right,
    breakpoint: best.breakpoint,
  };
}
