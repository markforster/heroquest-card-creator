"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonitorDown } from "lucide-react";

import styles from "@/app/page.module.css";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useDownloadCtaGlow } from "@/components/Layout/LeftNav/useDownloadCtaGlow";

const ENABLE_GET_APP_GLOW = false;

export default function LeftNavDownloadAction() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [isLocalInstall, setIsLocalInstall] = useState(false);

  const distribution = process.env.NEXT_PUBLIC_APP_DISTRIBUTION ?? "unknown";
  const isEligibleBuild =
    distribution === "itch" ||
    distribution === "self_hosted" ||
    distribution === "unknown" ||
    distribution === "npm" ||
    distribution === "download";
  const isUpdateAction = distribution === "download" || isLocalInstall;
  const { isGlowActive, handleGlowClick } = useDownloadCtaGlow({
    isEligibleBuild,
    enabled: ENABLE_GET_APP_GLOW,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLocalInstall(window.location.protocol === "file:");
  }, []);

  useEffect(() => {
    if (!isEligibleBuild) return;
    const link = linkRef.current;
    if (!link || typeof window === "undefined") return;
    const itch = (
      window as typeof window & {
        Itch?: {
          attachBuyButton?: (
            el: HTMLElement,
            opts: { user: string; game: string; width?: number; height?: number },
          ) => void;
        };
      }
    ).Itch;
    if (!itch?.attachBuyButton) return;
    itch.attachBuyButton(link, {
      user: "mark-forster",
      game: "heroquest-card-creator",
      width: 650,
      height: 400,
    });
  }, [isEligibleBuild]);

  const label = useMemo(() => {
    if (isUpdateAction) {
      return t("actions.checkForUpdates");
    }
    return t("actions.getTheApp");
  }, [isUpdateAction, t]);

  if (!isEligibleBuild) {
    return null;
  }

  return (
    <a
      ref={linkRef}
      href="https://mark-forster.itch.io/heroquest-card-creator?source=in-app-download"
      className={`${styles.leftNavItem} ${isUpdateAction ? styles.leftNavUpdateAction : ""} ${
        ENABLE_GET_APP_GLOW ? styles.leftNavItemGlow : ""
      } ${isGlowActive ? styles.leftNavItemGlowActive : ""} d-flex align-items-center gap-2`}
      onClickCapture={(event) => {
        event.preventDefault();
        track("page_view", { page_path: "/download", page_title: "Download" });
        handleGlowClick();
      }}
      aria-label={label}
      title={label}
    >
      <span className={styles.leftNavGlyph} aria-hidden="true">
        <MonitorDown />
      </span>
      <span className={styles.leftNavLabel}>{label}</span>
    </a>
  );
}
