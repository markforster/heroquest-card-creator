"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonitorDown } from "lucide-react";

import styles from "@/app/page.module.css";
import { useDownloadCtaGlow } from "@/components/Layout/LeftNav/useDownloadCtaGlow";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { getConfiguredAppDistribution } from "@/lib/app-distribution";
import { HQCC_ITCH_DOWNLOAD_URL, attachItchBuyButton } from "@/lib/itch";

const ENABLE_GET_APP_GLOW = false;

export default function LeftNavDownloadAction() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [isLocalInstall, setIsLocalInstall] = useState(false);

  const distribution = getConfiguredAppDistribution();
  const isEligibleBuild = true;
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
    attachItchBuyButton(linkRef.current);
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
      href={HQCC_ITCH_DOWNLOAD_URL}
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
