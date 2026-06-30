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

function sanitizeDeckNameSegment(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const collapsed = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return collapsed || "untitled-deck";
}

export function buildDeckPdfFileName(input: {
  deckName: string;
  date?: Date;
  suffix?: string;
}): string {
  const deckNameSegment = sanitizeDeckNameSegment(input.deckName);
  const timestampSegment = buildTimestampSegment(input.date ?? new Date());
  const suffixSegment = input.suffix ? `-${sanitizeDeckNameSegment(input.suffix)}` : "";
  return `HQCC--${deckNameSegment}${suffixSegment}-${timestampSegment}.pdf`;
}

export function buildDeckPdfAlignmentFileName(date: Date = new Date()): string {
  const timestampSegment = buildTimestampSegment(date);
  return `hqcc-pdf-alignment-test-${timestampSegment}.pdf`;
}
