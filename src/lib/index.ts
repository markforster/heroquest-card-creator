export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto & { randomUUID?: () => string }).randomUUID!();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

