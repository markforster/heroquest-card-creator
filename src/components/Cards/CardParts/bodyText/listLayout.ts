import { wrapTokens } from "@/lib/text-fitting/wrap";

import type { ListRun } from "./listBlocks";
import type { BodyTextToken, ListRow, RowMetrics, TextWrapToken } from "./types";

/** Recompute the marker gutters and wrapping at every candidate fitting size. */
export function layoutListRun({
  runs,
  safeWidth,
  fontSize,
  measure,
  tokenize,
  metrics,
}: {
  runs: ListRun[];
  safeWidth: number;
  fontSize: number;
  measure: (text: string, token?: TextWrapToken) => number;
  tokenize: (text: string) => BodyTextToken[];
  metrics: (tokens: BodyTextToken[]) => RowMetrics;
}): { rows: ListRow[]; horizontalOverflow: boolean } {
  const rows: ListRow[] = [];
  let horizontalOverflow = false;
  const gap = fontSize * 0.35;
  const visit = (siblings: ListRun[], origin: number) => {
    for (const run of siblings) {
      const column = run.items.reduce((max, item) => Math.max(max, measure(item.marker)), fontSize);
      const contentOffset = origin + column + gap;
      const available = safeWidth - contentOffset;
      for (const item of run.items) {
        const tokens = tokenize(item.content);
        const wrapped = available > 0 ? wrapTokens(tokens, available, measure) : [];
        // Empty styled content still owns a marker row. A failed width owns an invisible stop row.
        const lines = wrapped.length ? wrapped : [[]];
        lines.forEach((line, index) => {
          const advance = line.reduce(
            (sum, token) =>
              sum + (token.kind === "dice" ? token.width : measure(token.text, token)),
            0,
          );
          const blocked = available <= 0 || advance > available + 0.001;
          horizontalOverflow ||= blocked;
          rows.push({
            kind: "list",
            sourceLineIndex: item.sourceLineIndex,
            marker: index === 0 ? item.marker : undefined,
            markerEnd: contentOffset - gap,
            contentOffset,
            tokens: line,
            blocked,
            ...metrics(line),
          });
        });
        visit(item.children, contentOffset);
      }
    }
  };
  visit(runs, 0);
  return { rows, horizontalOverflow };
}
