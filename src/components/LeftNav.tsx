"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CopyPlus,
  Images,
  Layers,
  Settings,
  SquareStack,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useMatch } from "react-router-dom";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/AppActionsContext";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import KeyBinding from "@/components/KeyBinding";
import LanguageMenu from "@/components/LanguageMenu";
import NavActionButton from "@/components/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";
import { getCard } from "@/lib/cards-db";

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
  const {
    openSettings,
    openTemplatePicker,
    openRecent,
    isTemplatePickerOpen,
    isRecentOpen,
    isSettingsOpen,
  } = useAppActions();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const autoCollapsed = useMediaQuery(COLLAPSE_MEDIA_QUERY);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [isCollapsedReady, setIsCollapsedReady] = useState(false);
  const isCollapsed = autoCollapsed || manualCollapsed;
  const collapseStateLabel = isCollapsed ? "Expand navigation" : "Collapse navigation";
  const navigate = useNavigate();
  const isAssetsRoute = Boolean(useMatch("/assets"));
  const isCardsRoute = Boolean(useMatch("/cards"));
  const [currentCardName, setCurrentCardName] = useState<string | null>(null);
  const [currentCardThumbUrl, setCurrentCardThumbUrl] = useState<string | null>(null);
  const currentCardThumbRef = useRef<string | null>(null);
  const activeCardId =
    selectedTemplateId != null ? activeCardIdByTemplate[selectedTemplateId] : undefined;

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

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCardName(null);
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
      setCurrentCardThumbUrl(null);
      return;
    }

    let active = true;
    (async () => {
      try {
        const record = await getCard(activeCardId);
        if (!active || !record) return;
        setCurrentCardName(record.name || record.title || "Untitled card");
        if (currentCardThumbRef.current) {
          URL.revokeObjectURL(currentCardThumbRef.current);
          currentCardThumbRef.current = null;
        }
        if (record.thumbnailBlob) {
          const nextUrl = URL.createObjectURL(record.thumbnailBlob);
          currentCardThumbRef.current = nextUrl;
          setCurrentCardThumbUrl(nextUrl);
        } else {
          setCurrentCardThumbUrl(null);
        }
      } catch {
        if (!active) return;
        setCurrentCardName(null);
        if (currentCardThumbRef.current) {
          URL.revokeObjectURL(currentCardThumbRef.current);
          currentCardThumbRef.current = null;
        }
        setCurrentCardThumbUrl(null);
      }
    })();

    return () => {
      active = false;
      if (currentCardThumbRef.current) {
        URL.revokeObjectURL(currentCardThumbRef.current);
        currentCardThumbRef.current = null;
      }
    };
  }, [activeCardId]);

  if (!isCollapsedReady) {
    return null;
  }

  const spacerClassMap = {
    small: styles.leftNavSpacerSmall,
    medium: styles.leftNavSpacerMedium,
    large: styles.leftNavSpacerLarge,
  } as const;

  const LeftNavSpacer = ({
    size = "small",
    showLine = true,
  }: {
    size?: "small" | "medium" | "large";
    showLine?: boolean;
  }) => (
    <div
      className={`${styles.leftNavSpacer} ${spacerClassMap[size]} ${
        showLine ? styles.leftNavSpacerLine : ""
      }`}
      aria-hidden="true"
    />
  );

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
            <KeyBinding
              combo={{ key: "y", shift: true, meta: true }}
              onTrigger={() => openTemplatePicker()}
              label={t("tooltip.chooseTemplate")}
            >
              <KeyBinding
                combo={{ key: "y", shift: true, ctrl: true }}
                onTrigger={() => openTemplatePicker()}
                label={t("tooltip.chooseTemplate")}
              >
                {activeCardId ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.leftNavItem} ${styles.leftNavCurrentCard}`}
                      onClick={() => navigate(`/cards/${activeCardId}`)}
                      title={currentCardName ?? t("actions.cards")}
                      aria-label={currentCardName ?? t("actions.cards")}
                    >
                      <div className={styles.leftNavCurrentCardThumb}>
                        {currentCardThumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={currentCardThumbUrl} alt="" />
                        ) : (
                          <div className={styles.leftNavCurrentCardFallback} />
                        )}
                      </div>
                      <div className={styles.leftNavCurrentCardLabel}>
                        {currentCardName ?? t("actions.cards")}
                      </div>
                    </button>
                    <LeftNavSpacer size="small" showLine />
                  </>
                ) : null}
                <NavActionButton
                  label={t("actions.saveAsNew")}
                  icon={CopyPlus}
                  onClick={openTemplatePicker}
                  ariaLabel={t("tooltip.createFromTemplate")}
                  title={t("tooltip.createFromTemplate")}
                  isActive={isTemplatePickerOpen}
                  className={styles.leftNavNewButton}
                />
              </KeyBinding>
            </KeyBinding>
            <LeftNavSpacer size="medium" showLine={false} />
            <NavActionButton
              label={t("actions.recentCards")}
              icon={Clock}
              onClick={openRecent}
              title={t("actions.recentCards")}
              ariaLabel={t("actions.recentCards")}
              isActive={isRecentOpen}
            />
            <NavActionButton
              label={t("actions.cards")}
              icon={SquareStack}
              onClick={() => navigate("/cards")}
              title={t("tooltip.openCards")}
              ariaLabel={t("tooltip.openCards")}
              isActive={isCardsRoute}
            />
            {/* <LeftNavSpacer size="medium" showLine /> */}
            <NavActionButton
              label={t("actions.decks")}
              icon={Layers}
              onClick={() => {}}
              title={t("actions.decks")}
              ariaLabel={t("actions.decks")}
              isActive={false}
            />
            <LeftNavSpacer size="small" showLine={false} />
            <NavActionButton
              label={t("actions.assets")}
              icon={Images}
              onClick={() => navigate("/assets")}
              title={t("tooltip.openAssets")}
              ariaLabel={t("tooltip.openAssets")}
              isActive={isAssetsRoute}
            />
          </div>
        </div>
        <div className={styles.leftNavBottom}>
          <div className={styles.leftNavList}>
            <NavActionButton
              label={t("actions.settings")}
              icon={Settings}
              onClick={openSettings}
              title={t("tooltip.openSettings")}
              ariaLabel={t("tooltip.openSettings")}
              isActive={isSettingsOpen}
            />
            <LanguageMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </nav>
  );
}
