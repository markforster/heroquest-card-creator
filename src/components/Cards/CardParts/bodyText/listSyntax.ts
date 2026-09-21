export type ListCandidate = {
  depth: 0 | 1;
  ordered: boolean;
  sourceNumber?: number;
  content: string;
};

export type ListLine = ({ kind: "item" } & ListCandidate) | { kind: "escaped"; text: string };

function candidate(text: string): ListCandidate | null {
  const match = /^( {2})?(-|[0-9]{1,9}\.)( {1,4})(\S.*)$/.exec(text);
  if (!match) return null;
  const content = match[4];
  if (/^([-*_])(?: *\1)+ *$/.test(content)) return null;
  const ordered = match[2] !== "-";
  return {
    depth: match[1] ? 1 : 0,
    ordered,
    sourceNumber: ordered ? Number(match[2].slice(0, -1)) : undefined,
    content,
  };
}

/** Classify one untrimmed logical line; this is deliberately not CommonMark. */
export function classifyListLine(text: string): ListLine | null {
  const escaped = /^( {2})?\\(.*)$/.exec(text);
  if (escaped) {
    const literal = (escaped[1] ?? "") + escaped[2];
    if (candidate(literal)) return { kind: "escaped", text: literal };
  }
  const item = candidate(text);
  return item ? { kind: "item", ...item } : null;
}
