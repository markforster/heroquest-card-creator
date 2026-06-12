"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getConfiguredAppDistribution, supportsRemoteUpdateChecks } from "@/lib/app-distribution";
import { UPDATE_CHECK_INTERVAL_MS } from "@/lib/update-check/constants";
import { fetchGithubLatestRelease, fetchNpmLatestVersion } from "@/lib/update-check/sources";
import {
  readReconciledStoredUpdateState,
  readStoredUpdateState,
  writeStoredUpdateState,
} from "@/lib/update-check/storage";
import { isRemoteVersionNewer } from "@/lib/update-check/version";
import { APP_VERSION } from "@/version";

import type { AppDistribution } from "@/lib/app-distribution";
import type { StoredUpdateState, UpdateSource } from "@/lib/update-check/types";

type UpdateNoticeState = {
  distribution: AppDistribution;
  isOnline: boolean;
  isChecking: boolean;
  isUpdateAvailable: boolean;
  latestVersion: string | null;
  source: UpdateSource | null;
  error: string | null;
};

const UpdateNoticeContext = createContext<UpdateNoticeState | null>(null);

type UpdateNoticeProviderProps = {
  children: React.ReactNode;
};

function getDefaultState(distribution: AppDistribution): UpdateNoticeState {
  return {
    distribution,
    isOnline: typeof window === "undefined" ? true : navigator.onLine,
    isChecking: false,
    isUpdateAvailable: false,
    latestVersion: null,
    source: null,
    error: null,
  };
}

function createStateFromStored(
  distribution: AppDistribution,
  stored: StoredUpdateState | null,
): UpdateNoticeState {
  if (!stored || stored.distribution !== distribution) {
    return getDefaultState(distribution);
  }

  return {
    distribution,
    isOnline: typeof window === "undefined" ? true : navigator.onLine,
    isChecking: false,
    isUpdateAvailable: stored.isUpdateAvailable,
    latestVersion: stored.isUpdateAvailable ? stored.latestRemoteVersion : null,
    source: stored.source,
    error: null,
  };
}

export function UpdateNoticeProvider({ children }: UpdateNoticeProviderProps) {
  const distribution = getConfiguredAppDistribution();
  const initialIsOnline = typeof window === "undefined" ? true : navigator.onLine;
  const [state, setState] = useState<UpdateNoticeState>(() => {
    if (!supportsRemoteUpdateChecks(distribution)) {
      return { ...getDefaultState(distribution), isOnline: initialIsOnline };
    }
    return {
      ...createStateFromStored(
        distribution,
        readReconciledStoredUpdateState(distribution, APP_VERSION),
      ),
      isOnline: initialIsOnline,
    };
  });
  const timerRef = useRef<number | null>(null);
  const hasCompletedSuccessfulCheckThisSessionRef = useRef(false);

  useEffect(() => {
    setState((current) => {
      if (!supportsRemoteUpdateChecks(distribution)) {
        return { ...getDefaultState(distribution), isOnline: current.isOnline };
      }
      const stored = readReconciledStoredUpdateState(distribution, APP_VERSION);
      const seeded = createStateFromStored(distribution, stored);
      return {
        ...seeded,
        isOnline: current.isOnline,
        isChecking: current.isChecking,
      };
    });
  }, [distribution]);

  useEffect(() => {
    if (!supportsRemoteUpdateChecks(distribution) || typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const clearScheduledCheck = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const isDueForScheduledCheck = () => {
      const stored = readStoredUpdateState();
      if (!stored || stored.distribution !== distribution) {
        return true;
      }
      return Date.now() >= stored.lastSuccessfulCheckAt + UPDATE_CHECK_INTERVAL_MS;
    };

    const scheduleNextCheck = (lastSuccessfulCheckAt: number) => {
      clearScheduledCheck();
      const dueAt = lastSuccessfulCheckAt + UPDATE_CHECK_INTERVAL_MS;
      const delay = Math.max(0, dueAt - Date.now());
      timerRef.current = window.setTimeout(() => {
        if (!navigator.onLine) {
          clearScheduledCheck();
          return;
        }
        void runCheck();
      }, delay);
    };

    const runCheck = async () => {
      if (!navigator.onLine) {
        setState((current) => ({
          ...current,
          distribution,
          isOnline: false,
          isChecking: false,
        }));
        return;
      }

      setState((current) => ({ ...current, distribution, isChecking: true, error: null }));

      try {
        const result =
          distribution === "download"
            ? await fetchGithubLatestRelease()
            : await fetchNpmLatestVersion();

        if (cancelled) return;

        const isUpdateAvailable = isRemoteVersionNewer(APP_VERSION, result.latestVersion);
        const lastSuccessfulCheckAt = Date.now();
        hasCompletedSuccessfulCheckThisSessionRef.current = true;

        writeStoredUpdateState({
          distribution,
          lastSuccessfulCheckAt,
          latestRemoteVersion: result.latestVersion,
          isUpdateAvailable,
          source: result.source,
        });

        setState({
          distribution,
          isOnline: true,
          isChecking: false,
          isUpdateAvailable,
          latestVersion: isUpdateAvailable ? result.latestVersion : null,
          source: result.source,
          error: null,
        });

        scheduleNextCheck(lastSuccessfulCheckAt);
      } catch (error) {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          distribution,
          isOnline: navigator.onLine,
          isChecking: false,
          error: error instanceof Error ? error.message : "Update check failed",
        }));
      }
    };

    const handleOffline = () => {
      clearScheduledCheck();
      setState((current) => ({
        ...current,
        distribution,
        isOnline: false,
        isChecking: false,
      }));
    };

    const handleOnline = () => {
      setState((current) => ({
        ...current,
        distribution,
        isOnline: true,
      }));

      if (
        !hasCompletedSuccessfulCheckThisSessionRef.current ||
        isDueForScheduledCheck()
      ) {
        void runCheck();
        return;
      }

      const stored = readStoredUpdateState();
      if (stored && stored.distribution === distribution) {
        scheduleNextCheck(stored.lastSuccessfulCheckAt);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setState((current) => ({
      ...current,
      distribution,
      isOnline: navigator.onLine,
    }));

    if (navigator.onLine) {
      void runCheck();
    }

    return () => {
      cancelled = true;
      clearScheduledCheck();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [distribution]);

  const value = useMemo<UpdateNoticeState>(() => state, [state]);

  return <UpdateNoticeContext.Provider value={value}>{children}</UpdateNoticeContext.Provider>;
}

export function useUpdateNotice(): UpdateNoticeState {
  const context = useContext(UpdateNoticeContext);
  if (!context) {
    throw new Error("useUpdateNotice must be used within UpdateNoticeProvider");
  }
  return context;
}
