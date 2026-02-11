"use client";

export function extractFileName(href: string): string | null {
  const trimmed = href.split("#")[0]?.split("?")[0];
  if (!trimmed) return null;

  const parts = trimmed.split("/");
  const last = parts[parts.length - 1];
  return last || null;
}

export function guessOriginalFileName(fileName: string): string[] {
  const candidates = new Set([fileName]);

  const dotParts = fileName.split(".");
  if (dotParts.length >= 3) {
    const ext = dotParts[dotParts.length - 1];
    const base = dotParts.slice(0, -2).join(".");
    candidates.add(`${base}.${ext}`);
  }

  if (dotParts.length === 2) {
    const ext = dotParts[1];
    const base = dotParts[0];
    const withoutDashHash = base.replace(/-[0-9a-f]{8,}$/i, "");
    if (withoutDashHash !== base) {
      candidates.add(`${withoutDashHash}.${ext}`);
    }
  }

  return Array.from(candidates);
}

export function readBlobAsDataUrl(blob: Blob, errorMessage = "Failed to read blob"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(blob);
  });
}

export function resolveCardPreviewFileName(
  cardData: { title?: string } | null | undefined,
  templateName?: string,
  fallback = "card",
): string {
  const rawTitle =
    (cardData && "title" in cardData && (cardData as { title?: string }).title) ||
    templateName ||
    fallback;

  const trimmed = rawTitle.trim();
  const lower = trimmed.toLowerCase();
  const replacedSpaces = lower.replace(/\s+/g, "-");
  const safe = replacedSpaces.replace(/[^a-z0-9\-_.]+/g, "");

  return (safe || fallback) + ".png";
}
