"use client";

import { useEffect } from "react";

import { requestStoragePersistence } from "@/lib/storage-persistence";

import type { ReactNode } from "react";

export function StoragePersistenceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void requestStoragePersistence();
  }, []);

  return <>{children}</>;
}
