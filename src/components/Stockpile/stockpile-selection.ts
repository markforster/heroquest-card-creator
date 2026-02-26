export function resolveSingleSelectToggle(prev: string[], id: string): string[] {
  return prev.length === 1 && prev[0] === id ? [] : [id];
}

