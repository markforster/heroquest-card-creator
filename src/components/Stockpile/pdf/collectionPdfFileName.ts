"use client";

function buildTimestampSegment(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("-");
}

function sanitizeCollectionNameSegment(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const collapsed = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return collapsed || "collection";
}

export function buildCollectionPdfFileName(input: {
  collectionName: string;
  date?: Date;
}): string {
  const collectionNameSegment = sanitizeCollectionNameSegment(input.collectionName);
  const timestampSegment = buildTimestampSegment(input.date ?? new Date());
  return `HQCC--${collectionNameSegment}-${timestampSegment}.pdf`;
}
