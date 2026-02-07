"use client";

import { useEffect, useState } from "react";

export default function useIsTauriApp() {
  const [isTauriApp, setIsTauriApp] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (typeof window === "undefined") {
      return undefined;
    }

    (async () => {
      try {
        const { isTauri } = await import("@tauri-apps/api/core");
        const detected = await isTauri();
        if (isActive) {
          setIsTauriApp(Boolean(detected));
        }
      } catch {
        if (isActive) {
          setIsTauriApp(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  return isTauriApp;
}
