"use client";

export const BACKUP_MANIFEST_FILENAME = "manifest.json";
export const BACKUP_METADATA_FILENAME_V1 = "metadata.json";
export const BACKUP_METADATA_FILENAME_V2 = "metadata";
export const BACKUP_LEGACY_FILENAME = "backup.json";
export const COMPACT_PAYLOAD_ID_V1 = "compact-zip-v1" as const;
export const COMPACT_PAYLOAD_ID_V2 = "compact-zip-v2" as const;
export const COMPACT_CONTAINER_VERSION = 1 as const;
export const COMPACT_BLOB_DIR = "blobs";

const COMPACT_BLOB_CODE_LENGTH = 6;
const COMPACT_BLOB_ID_TAIL_LENGTH = 6;
const COMPACT_BLOB_SALT = "hqcc-compact-v2";

export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function getIdTail(id: string, length: number): string {
  if (id.length <= length) return id;
  return id.slice(-length);
}

export function buildObfuscatedBlobRef(type: "asset" | "thumb", id: string): string {
  const tail = getIdTail(id, COMPACT_BLOB_ID_TAIL_LENGTH);
  const code = fnv1aHex(`${type}|${tail}|${COMPACT_BLOB_SALT}`).slice(
    0,
    COMPACT_BLOB_CODE_LENGTH,
  );
  return `${COMPACT_BLOB_DIR}/${code}-${id}`;
}

export function isValidObfuscatedBlobRef(
  type: "asset" | "thumb",
  id: string,
  ref: string,
): boolean {
  if (!ref.startsWith(`${COMPACT_BLOB_DIR}/`)) return false;
  return ref === buildObfuscatedBlobRef(type, id);
}
