import { classifyListLine } from "./listSyntax";

export type ListItem = {
  content: string;
  sourceLineIndex: number;
  sourceNumber?: number;
  marker: string;
  children: ListRun[];
};
export type ListRun = { ordered: boolean; items: ListItem[] };

/** Collect adjacent candidate lines, preserving parent ownership and sibling runs. */
export function collectListRun(
  lines: string[],
  start: number,
): {
  runs: ListRun[];
  nextIndex: number;
} {
  const runs: ListRun[] = [];
  let parent: ListItem | undefined;
  let index = start;
  for (; index < lines.length; index += 1) {
    const entry = classifyListLine(lines[index]);
    if (!entry || entry.kind !== "item" || (entry.depth === 1 && !parent)) break;
    const siblings = entry.depth === 0 ? runs : parent!.children;
    let run = siblings[siblings.length - 1];
    if (!run || run.ordered !== entry.ordered) {
      run = { ordered: entry.ordered, items: [] };
      siblings.push(run);
    }
    const number = (run.items[0]?.sourceNumber ?? entry.sourceNumber ?? 0) + run.items.length;
    const item: ListItem = {
      content: entry.content,
      sourceLineIndex: index,
      sourceNumber: entry.sourceNumber,
      marker: entry.ordered ? `${number}.` : "•",
      children: [],
    };
    run.items.push(item);
    if (entry.depth === 0) parent = item;
  }
  return { runs, nextIndex: index };
}
