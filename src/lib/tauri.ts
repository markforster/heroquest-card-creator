"use client";

export async function openDownloadsFolderIfTauri(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    const detected = await Promise.resolve(isTauri());
    if (!detected) {
      return;
    }

    const { downloadDir } = await import("@tauri-apps/api/path");
    const { openPath } = await import("@tauri-apps/plugin-opener");

    const downloadsPath = await downloadDir();
    if (!downloadsPath) {
      return;
    }

    await openPath(downloadsPath);
  } catch {
    // No-op outside Tauri or when permissions are missing.
  }
}
