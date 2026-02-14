export function wrapHeaderLinesApprox(text: string, maxWidth: number, fontSize: number): string[] {
  const approxCharWidth = fontSize * 0.6;
  const words = text.split(" ");
  const lines: string[] = [];

  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const estimatedWidth = candidate.length * approxCharWidth;

    if (!current || estimatedWidth <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
