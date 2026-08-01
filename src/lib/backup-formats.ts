"use client";

/**
 * Supported backup container formats that can be selected by the app.
 */
export type BackupContainerFormat = "legacy-zip-json" | "compact-zip-v1";

/**
 * Local-storage key used to remember the preferred backup format.
 */
export const BACKUP_FORMAT_STORAGE_KEY = "hqcc.backup.format";
/**
 * Default backup container format used when no preference has been stored yet.
 */
export const DEFAULT_BACKUP_FORMAT: BackupContainerFormat = "compact-zip-v1";

const LEGACY_ALIASES = new Set(["legacy", "legacy-zip", "legacy-zip-json"]);
const COMPACT_ALIASES = new Set(["compact", "compact-zip", "compact-zip-v1"]);

/**
 * Normalizes legacy aliases and persisted values into a supported backup format identifier.
 */
export function normalizeBackupFormat(
  raw: string | null | undefined,
): BackupContainerFormat | null {
  if (!raw) return null;
  if (LEGACY_ALIASES.has(raw)) return "legacy-zip-json";
  if (COMPACT_ALIASES.has(raw)) return "compact-zip-v1";
  return null;
}
