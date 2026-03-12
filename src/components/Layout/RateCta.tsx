"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { CSSProperties } from "react";

import styles from "@/app/page.module.css";
import avatarFile from "@/assets/avatar.jpeg";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useLocalStorageBoolean } from "@/components/Providers/LocalStorageProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { embeddedImagesByFileName } from "@/generated/embeddedAssets";

const CTA_SHIMMER_INTERVAL_MS = 8_000;
const CTA_PULSE_INTERVAL_MS = 60_000;
const CTA_PULSE_DURATION_MS = 1_000;
const CTA_ACTIVE_TIME_THRESHOLD_MS = 10 * 60 * 1000;
const CTA_ACTIVE_TIME_STORAGE_KEY = "hqcc.rateAppActiveMs";
const CTA_ACTIVE_TIME_FLUSH_MS = 30_000;

type RateCtaProps = {
  className?: string;
};

export default function RateCta({ className }: RateCtaProps) {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const [hasClickedRate, setHasClickedRate] = useLocalStorageBoolean("hqcc.rateAppClicked", false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [tooltipPlacement, setTooltipPlacement] = useState<"top" | "bottom">("top");
  const [activeMs, setActiveMs] = useState(0);
  const activeMsRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const fallbackAvatar = typeof avatarFile === "string" ? avatarFile : avatarFile.src;
  const rateAvatar =
    embeddedImagesByFileName["avatar.jpeg"] ??
    embeddedImagesByFileName["src/assets/avatar.jpeg"] ??
    fallbackAvatar;
  const tooltipId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CTA_ACTIVE_TIME_STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          activeMsRef.current = parsed;
          setActiveMs(parsed);
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasClickedRate) {
      try {
        window.localStorage.removeItem(CTA_ACTIVE_TIME_STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
      return;
    }
    if (activeMsRef.current >= CTA_ACTIVE_TIME_THRESHOLD_MS) {
      return;
    }

    let segmentStart: number | null = null;
    let flushTimerId: number | null = null;

    const persistActiveMs = (next: number) => {
      try {
        window.localStorage.setItem(CTA_ACTIVE_TIME_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors.
      }
    };

    const finishSegment = () => {
      if (segmentStart === null) return;
      const now = performance.now();
      const delta = Math.max(0, now - segmentStart);
      segmentStart = null;
      if (!delta) return;
      const next = Math.min(activeMsRef.current + delta, CTA_ACTIVE_TIME_THRESHOLD_MS);
      if (next !== activeMsRef.current) {
        activeMsRef.current = next;
        persistActiveMs(next);
        setActiveMs(next);
      }
    };

    const startSegment = () => {
      if (segmentStart !== null) return;
      segmentStart = performance.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startSegment();
      } else {
        finishSegment();
      }
    };

    const handleUnload = () => {
      finishSegment();
    };

    if (document.visibilityState === "visible") {
      startSegment();
    }

    if (CTA_ACTIVE_TIME_FLUSH_MS > 0) {
      flushTimerId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        finishSegment();
        if (activeMsRef.current < CTA_ACTIVE_TIME_THRESHOLD_MS) {
          startSegment();
        }
      }, CTA_ACTIVE_TIME_FLUSH_MS);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
      finishSegment();
      if (flushTimerId) window.clearInterval(flushTimerId);
    };
  }, [hasClickedRate]);

  const isCtaEligible = !hasClickedRate && activeMs >= CTA_ACTIVE_TIME_THRESHOLD_MS;

  useEffect(() => {
    if (hasClickedRate || !isCtaEligible) {
      setIsPulsing(false);
      return;
    }
    if (typeof window === "undefined") return;
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motionQuery?.matches) return;

    let pulseTimeoutId: number | null = null;
    const triggerPulse = () => {
      setIsPulsing(true);
      pulseTimeoutId = window.setTimeout(() => setIsPulsing(false), CTA_PULSE_DURATION_MS);
    };
    const intervalId = window.setInterval(triggerPulse, CTA_PULSE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (pulseTimeoutId) {
        window.clearTimeout(pulseTimeoutId);
      }
    };
  }, [hasClickedRate, isCtaEligible]);

  const ctaStyle = {
    "--cta-shimmer-interval": `${CTA_SHIMMER_INTERVAL_MS}ms`,
    "--cta-pulse-interval": `${CTA_PULSE_INTERVAL_MS}ms`,
    "--cta-pulse-duration": `${CTA_PULSE_DURATION_MS}ms`,
  } as CSSProperties;

  const updateTooltipPlacement = () => {
    if (!wrapperRef.current || !tooltipRef.current) return;
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 12;
    const spaceAbove = wrapperRect.top;
    const spaceBelow = window.innerHeight - wrapperRect.bottom;
    const needsFlip = spaceBelow < tooltipRect.height + padding && spaceAbove > spaceBelow;
    setTooltipPlacement(needsFlip ? "top" : "bottom");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    updateTooltipPlacement();
    const handleResize = () => updateTooltipPlacement();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, []);

  return (
    <div
      className={`${styles.footerCtaWrapper} ${hasClickedRate ? styles.footerCtaClicked : ""} ${
        className ?? ""
      }`}
      style={ctaStyle}
      ref={wrapperRef}
    >
      <a
        href="https://mark-forster.itch.io/heroquest-card-creator/rate?source=in-app&popup=1"
        className={`${styles.footerCtaLink} ${
          isCtaEligible ? styles.footerCtaAttention : styles.footerCtaMuted
        } ${isPulsing ? styles.footerCtaPulse : ""}`}
        aria-describedby={tooltipId}
        onMouseEnter={updateTooltipPlacement}
        onFocus={updateTooltipPlacement}
        onClick={(event) => {
          event.preventDefault();
          track("rate_app_click", { page_path: "/rate", page_title: "Rate App" });
          setHasClickedRate(true);
          try {
            window.localStorage.removeItem(CTA_ACTIVE_TIME_STORAGE_KEY);
          } catch {
            // Ignore storage errors.
          }
          const popupUrl = event.currentTarget.href;
          const popupWidth = 984;
          const popupHeight = 616;
          const screenLeft = window.screenX ?? window.screenLeft ?? 0;
          const screenTop = window.screenY ?? window.screenTop ?? 0;
          const outerWidth = window.outerWidth || window.innerWidth;
          const outerHeight = window.outerHeight || window.innerHeight;
          const left = Math.round(screenLeft + (outerWidth - popupWidth) / 2);
          const top = Math.round(screenTop + (outerHeight - popupHeight) / 2);
          window.open(
            popupUrl,
            "itch-rate",
            `width=${popupWidth},height=${popupHeight},left=${left},top=${top},menubar=no,toolbar=no,resizable=yes,scrollbars=yes`,
          );
        }}
      >
        <span className={styles.footerCtaTextWrap}>
          <span
            className={`${styles.footerCtaTextDefault} ${styles.footerCtaTextShimmer}`}
            data-text={t("actions.rateOnItch")}
          >
            {t("actions.rateOnItch")}
          </span>
          <span className={styles.footerCtaTextHover}>{t("actions.rateOnItchHover")}</span>
        </span>
      </a>
      <div
        id={tooltipId}
        role="tooltip"
        ref={tooltipRef}
        className={`${styles.footerCtaTooltip} ${
          tooltipPlacement === "top" ? styles.footerCtaTooltipTop : styles.footerCtaTooltipBottom
        }`}
      >
        <div className={styles.footerCtaTooltipContent}>
          {rateAvatar ? (
            <img
              className={styles.footerCtaAvatar}
              src={rateAvatar}
              alt="Mark Forster"
              width={32}
              height={32}
            />
          ) : null}
          <span>{t("tooltip.rateAppCta")}</span>
        </div>
      </div>
    </div>
  );
}
