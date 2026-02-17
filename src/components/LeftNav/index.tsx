"use client";

import { CopyPlus, Images } from "lucide-react";
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
import LeftNavBottom from "./LeftNavBottom";
import LeftNavCollapseToggle from "./LeftNavCollapseToggle";
import CardsAction from "./CardsAction";
import DecksAction from "./DecksAction";
import LeftNavMiddle from "./LeftNavMiddle";
import RecentCardsAction from "./RecentCardsAction";
import SettingsAction from "./SettingsAction";

const COLLAPSE_MEDIA_QUERY = "(max-width: 1280px)";
const NAV_COLLAPSE_STORAGE_KEY = "hqcc.leftNavCollapsed";
const SHOW_DECKS = false;
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
  const { openTemplatePicker, isTemplatePickerOpen } = useAppActions();
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
        <LeftNavCollapseToggle
          isCollapsed={isCollapsed}
          label={collapseStateLabel}
          onToggle={() => setManualCollapsed((prev) => !prev)}
        />
        <LeftNavMiddle>
          <KeyBinding
            combo={{ key: "y", shift: true, meta: true }}
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
                {/* <LeftNavSpacer size="small" showLine={false} /> */}
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
          <LeftNavSpacer size="small" showLine={false} />
          <RecentCardsAction />
          <CardsAction />
          {/* <LeftNavSpacer size="medium" showLine /> */}
          <DecksAction isEnabled={SHOW_DECKS} />
          <LeftNavSpacer size="small" showLine={false} />
          <NavActionButton
            label={t("actions.assets")}
            icon={Images}
            onClick={() => navigate("/assets")}
            title={t("tooltip.openAssets")}
            ariaLabel={t("tooltip.openAssets")}
            isActive={isAssetsRoute}
          />
        </LeftNavMiddle>
        <LeftNavBottom>
          <SettingsAction />
          <LanguageMenu isCollapsed={isCollapsed} />
        </LeftNavBottom>
      </div>
    </nav>
  );
}
