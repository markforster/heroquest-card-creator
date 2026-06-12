import { parseAppDistribution } from "@/lib/app-distribution";
import { UPDATE_STORAGE_KEYS } from "@/lib/update-check/constants";
import { isRemoteVersionNewer } from "@/lib/update-check/version";

import type { AppDistribution } from "@/lib/app-distribution";
import type { StoredUpdateState, UpdateSource } from "@/lib/update-check/types";

export function readStoredUpdateState(): StoredUpdateState | null {
  if (typeof window === "undefined") return null;

  try {
    const distribution = parseAppDistribution(window.localStorage.getItem(UPDATE_STORAGE_KEYS.distribution));
    const lastSuccessfulCheckAt = Number(
      window.localStorage.getItem(UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt),
    );
    const latestRemoteVersion = window.localStorage.getItem(UPDATE_STORAGE_KEYS.latestRemoteVersion);
    const isUpdateAvailable = window.localStorage.getItem(UPDATE_STORAGE_KEYS.available) === "1";
    const rawSource = window.localStorage.getItem(UPDATE_STORAGE_KEYS.source);
    const source: UpdateSource | null =
      rawSource === "github" || rawSource === "npm" ? rawSource : null;

    if (distribution === "unknown" || !Number.isFinite(lastSuccessfulCheckAt) || lastSuccessfulCheckAt <= 0) {
      return null;
    }

    return {
      distribution,
      lastSuccessfulCheckAt,
      latestRemoteVersion,
      isUpdateAvailable,
      source,
    };
  } catch {
    return null;
  }
}

export function writeStoredUpdateState(state: StoredUpdateState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.distribution, state.distribution);
    window.localStorage.setItem(
      UPDATE_STORAGE_KEYS.lastSuccessfulCheckAt,
      String(state.lastSuccessfulCheckAt),
    );
    if (state.latestRemoteVersion) {
      window.localStorage.setItem(UPDATE_STORAGE_KEYS.latestRemoteVersion, state.latestRemoteVersion);
    } else {
      window.localStorage.removeItem(UPDATE_STORAGE_KEYS.latestRemoteVersion);
    }
    window.localStorage.setItem(UPDATE_STORAGE_KEYS.available, state.isUpdateAvailable ? "1" : "0");
    if (state.source) {
      window.localStorage.setItem(UPDATE_STORAGE_KEYS.source, state.source);
    } else {
      window.localStorage.removeItem(UPDATE_STORAGE_KEYS.source);
    }
  } catch {
    // Ignore storage errors.
  }
}

export function readReconciledStoredUpdateState(
  distribution: AppDistribution,
  localVersion: string,
): StoredUpdateState | null {
  const stored = readStoredUpdateState();
  if (!stored || stored.distribution !== distribution) {
    return null;
  }

  if (isRemoteVersionNewer(localVersion, stored.latestRemoteVersion ?? "")) {
    return {
      ...stored,
      isUpdateAvailable: true,
    };
  }

  const reconciledState: StoredUpdateState = {
    distribution: stored.distribution,
    lastSuccessfulCheckAt: stored.lastSuccessfulCheckAt,
    latestRemoteVersion: null,
    isUpdateAvailable: false,
    source: null,
  };

  writeStoredUpdateState(reconciledState);

  return reconciledState;
}
