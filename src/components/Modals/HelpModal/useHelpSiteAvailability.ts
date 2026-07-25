"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { checkHelpSiteAvailability } from "./help-site-availability";

export type HelpSiteAvailability = "checking" | "available" | "unavailable";

export default function useHelpSiteAvailability(isOpen: boolean) {
  const [availability, setAvailability] = useState<HelpSiteAvailability>("checking");
  const requestIdRef = useRef(0);

  const checkAvailability = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!navigator.onLine) {
      setAvailability("unavailable");
      return;
    }

    setAvailability("checking");
    const isAvailable = await checkHelpSiteAvailability();

    if (requestId === requestIdRef.current) {
      setAvailability(isAvailable ? "available" : "unavailable");
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      requestIdRef.current += 1;
      return;
    }

    const handleOnline = () => {
      void checkAvailability();
    };
    const handleOffline = () => {
      requestIdRef.current += 1;
      setAvailability("unavailable");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void checkAvailability();

    return () => {
      requestIdRef.current += 1;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkAvailability, isOpen]);

  return {
    availability,
    retry: checkAvailability,
  };
}
