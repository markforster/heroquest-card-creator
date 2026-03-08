"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { buildAnalyticsContext } from "@/lib/analytics-context";
import { APP_VERSION } from "@/version";

type AnalyticsTrackParams = Record<string, string | number | boolean | null | undefined>;

type AnalyticsContextValue = {
  track: (event: string, params?: AnalyticsTrackParams) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

type AnalyticsProviderProps = {
  gaId?: string;
  children: React.ReactNode;
};

const PIXEL_URL = process.env.NEXT_PUBLIC_PIXEL_URL;
const PIXEL_KEY = process.env.NEXT_PUBLIC_PIXEL_KEY;
const CID_STORAGE_KEY = "hqcc.analytics.cid";
const IP_STORAGE_KEY = "hqcc.analytics.ip";
const PIXEL_DEBUG =
  process.env.NEXT_PUBLIC_PIXEL_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_PIXEL_DEBUG === "true";

function getOrCreateCid(): string {
  try {
    const existing = window.localStorage.getItem(CID_STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cid-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(CID_STORAGE_KEY, generated);
    return generated;
  } catch (_err) {
    return `cid-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

async function getOrFetchIp(): Promise<string | null> {
  try {
    const existing = window.sessionStorage.getItem(IP_STORAGE_KEY);
    if (existing) {
      if (PIXEL_DEBUG) console.log("[pixel] using cached ip", existing);
      return existing;
    }
  } catch (_err) {}

  try {
    if (PIXEL_DEBUG) console.log("[pixel] fetching ip via ipify");
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { ip?: string };
    if (data.ip && typeof data.ip === "string") {
      try {
        window.sessionStorage.setItem(IP_STORAGE_KEY, data.ip);
      } catch (_err) {}
      if (PIXEL_DEBUG) console.log("[pixel] ipify success", data.ip);
      return data.ip;
    }
  } catch (_err) {}
  if (PIXEL_DEBUG) console.log("[pixel] ipify failed");
  return null;
}

function addParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined) return;
  if (typeof value === "boolean") {
    params.set(key, value ? "1" : "0");
    return;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value)) params.set(key, String(value));
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  }
}

function sendPixel(event: string, params?: AnalyticsTrackParams) {
  if (!PIXEL_URL) return;
  if (typeof window === "undefined") return;
  const query = new URLSearchParams();
  const protocol = window.location.protocol;
  const isFile = protocol === "file:";
  const context = buildAnalyticsContext(window.location, APP_VERSION);

  addParam(query, "e", event);
  addParam(query, "v", APP_VERSION);
  addParam(query, "src", isFile ? "file_install" : "web");
  addParam(query, "cid", getOrCreateCid());
  addParam(query, "k", PIXEL_KEY);
  addParam(query, "app_distribution", context.app_distribution);
  addParam(query, "app_version", context.app_version);
  addParam(query, "app_host", context.app_host);
  addParam(query, "app_url", context.app_url);

  const pagePath = params?.page_path;
  const pageTitle = params?.page_title;
  addParam(query, "p", isFile ? "/local-install" : pagePath ?? window.location.pathname);
  addParam(query, "u", isFile ? "file://local-install" : window.location.href);
  addParam(query, "meta_page_title", pageTitle);

  addParam(query, "meta_lang", navigator.language);
  addParam(query, "meta_tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
  addParam(query, "meta_sr", `${window.screen.width}x${window.screen.height}`);
  addParam(query, "meta_vp", `${window.innerWidth}x${window.innerHeight}`);
  addParam(query, "meta_ua", navigator.userAgent);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key === "page_path" || key === "page_title") continue;
      addParam(query, `meta_${key}`, value);
    }
  }

  const img = new Image();
  img.referrerPolicy = "no-referrer";
  const base = `${PIXEL_URL}${PIXEL_URL.includes("?") ? "&" : "?"}`;
  getOrFetchIp()
    .then((ip) => {
      if (ip) {
        addParam(query, "ip_override", ip);
        if (PIXEL_DEBUG) console.log("[pixel] attached ip_override", ip);
      } else if (PIXEL_DEBUG) {
        console.log("[pixel] no ip_override attached");
      }
      img.src = `${base}${query.toString()}`;
    })
    .catch(() => {
      if (PIXEL_DEBUG) console.log("[pixel] ip fetch error; sending without ip_override");
      img.src = `${base}${query.toString()}`;
    });
}

export function AnalyticsProvider({ gaId, children }: AnalyticsProviderProps) {
  const track = useCallback<AnalyticsContextValue["track"]>(
    (event, params) => {
      if (typeof window === "undefined") return;
      const isFile = window.location.protocol === "file:";
      const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
      const hasGtag = typeof gtag === "function" && Boolean(gaId);
      const context = buildAnalyticsContext(window.location, APP_VERSION);

      if (isFile || !hasGtag) {
        sendPixel(event, params);
        return;
      }

      gtag("event", event, {
        ...(params ?? {}),
        ...context,
        send_to: gaId,
      });
    },
    [gaId],
  );

  const value = useMemo<AnalyticsContextValue>(() => ({ track }), [track]);

  useEffect(() => {
    track("app_open");
  }, [track]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }
  return ctx;
}
