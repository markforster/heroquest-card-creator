"use client";

type ParsedName = {
  base: string;
  extension: string;
};

const SUFFIX_PATTERN = /^(.*) \((\d+)\)$/;

export function splitFilename(name: string): ParsedName {
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0) {
    return {
      base: name.slice(0, lastDot),
      extension: name.slice(lastDot),
    };
  }

  return {
    base: name,
    extension: "",
  };
}

export function parseSuffix(base: string): { root: string; suffix: number | null } {
  const match = SUFFIX_PATTERN.exec(base);
  if (!match) {
    return { root: base, suffix: null };
  }

  const suffix = Number.parseInt(match[2], 10);
  if (!Number.isFinite(suffix) || suffix <= 0) {
    return { root: base, suffix: null };
  }

  return { root: match[1], suffix };
}

export function getNextAvailableFilename(
  existingNames: Iterable<string>,
  incomingName: string,
): string {
  const existingSet = existingNames instanceof Set ? existingNames : new Set(existingNames);
  if (!existingSet.has(incomingName)) {
    return incomingName;
  }

  const { base, extension } = splitFilename(incomingName);
  const { root } = parseSuffix(base);
  const used = new Set<number>();

  existingSet.forEach((name) => {
    const parsed = splitFilename(name);
    if (parsed.extension !== extension) return;

    const { root: candidateRoot, suffix } = parseSuffix(parsed.base);
    if (candidateRoot !== root) return;

    if (suffix == null) {
      used.add(1);
    } else {
      used.add(suffix);
    }
  });

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return `${root} (${next})${extension}`;
}
