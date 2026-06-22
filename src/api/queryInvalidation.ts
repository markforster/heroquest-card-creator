import type { QueryClient } from "@tanstack/react-query";

const COLLECTION_QUERY_PATHS = new Set(["/collections", "/collections/:id"]);

export async function invalidateCollectionsQueries(queryClient: QueryClient): Promise<void> {
  const predicate = (query: { queryKey: ReadonlyArray<unknown> }) =>
    Array.isArray(query.queryKey) &&
    query.queryKey.some(
      (segment) =>
        typeof segment === "object" &&
        segment !== null &&
        "path" in segment &&
        typeof segment.path === "string" &&
        COLLECTION_QUERY_PATHS.has(segment.path),
    );

  await queryClient.invalidateQueries({ predicate });
  await queryClient.refetchQueries({
    predicate,
    type: "active",
  });
}
