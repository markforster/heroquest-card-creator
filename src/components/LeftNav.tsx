"use client";

import { ChevronLeft, ChevronRight, Images, Layers, Settings, SquareStack } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/AppActionsContext";
import { previewModeFlags, usePreviewMode } from "@/components/PreviewModeContext";
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/i18n/I18nProvider";

const COLLAPSE_MEDIA_QUERY = "(max-width: 1280px)";
const NAV_COLLAPSE_STORAGE_KEY = "hqcc.leftNavCollapsed";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export default function LeftNav() {
  const { t } = useI18n();
  const { openAssets, openStockpile, openSettings } = useAppActions();
  const { previewMode, togglePreviewMode } = usePreviewMode();
  const { SHOW_BLUEPRINTS_TOGGLE } = previewModeFlags;
  const autoCollapsed = useMediaQuery(COLLAPSE_MEDIA_QUERY);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [isCollapsedReady, setIsCollapsedReady] = useState(false);
  const isCollapsed = autoCollapsed || manualCollapsed;
  const collapseStateLabel = isCollapsed ? "Expand navigation" : "Collapse navigation";
  const previewModeLabel =
    previewMode === "blueprint" ? t("label.previewBlueprint") : t("label.previewLegacy");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(NAV_COLLAPSE_STORAGE_KEY);
      if (stored === "true") {
        setManualCollapsed(true);
      }
      setIsCollapsedReady(true);
    } catch {
      // Ignore localStorage errors.
      setIsCollapsedReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, String(manualCollapsed));
    } catch {
      // Ignore localStorage errors.
    }
  }, [manualCollapsed]);

  if (!isCollapsedReady) {
    return null;
  }

  return (
    <nav
      className={`${styles.leftNav} ${isCollapsed ? styles.leftNavCollapsed : ""}`}
      aria-label={t("app.title")}
    >
      <div className={styles.leftNavInner}>
        <div className={styles.leftNavTop}>
          <button
            className={styles.leftNavToggle}
            type="button"
            onClick={() => setManualCollapsed((prev) => !prev)}
            title={collapseStateLabel}
            aria-label={collapseStateLabel}
          >
            {isCollapsed ? (
              <ChevronRight className={styles.leftNavToggleIcon} aria-hidden="true" />
            ) : (
              <ChevronLeft className={styles.leftNavToggleIcon} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className={styles.leftNavMiddle}>
          <div className={styles.leftNavList}>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openStockpile}
              title={t("tooltip.openCards")}
              aria-label={t("tooltip.openCards")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <SquareStack />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.cards")}</span>
            </button>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openAssets}
              title={t("tooltip.openAssets")}
              aria-label={t("tooltip.openAssets")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Images />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.assets")}</span>
            </button>
          </div>
        </div>
        <div className={styles.leftNavBottom}>
          <div className={styles.leftNavList}>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openSettings}
              title={t("tooltip.openSettings")}
              aria-label={t("tooltip.openSettings")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Settings />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.settings")}</span>
            </button>
            {SHOW_BLUEPRINTS_TOGGLE ? (
              <button
                className={styles.leftNavItem}
                type="button"
                onClick={togglePreviewMode}
                title={t("tooltip.previewMode")}
                aria-pressed={previewMode === "blueprint"}
                aria-label={`${t("label.previewMode")}: ${previewModeLabel}`}
              >
                <span className={styles.leftNavGlyph} aria-hidden="true">
                  <Layers />
                </span>
                <span className={styles.leftNavLabel}>
                  {t("label.previewMode")}: {previewModeLabel}
                </span>
              </button>
            ) : null}
            <LanguageMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </nav>
  );
}
