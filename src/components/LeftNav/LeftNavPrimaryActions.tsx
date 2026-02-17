"use client";

import { CopyPlus, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/AppActionsContext";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import KeyBinding from "@/components/KeyBinding";
import NavActionButton from "@/components/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";

import CardsAction from "./CardsAction";
import { SHOW_DECKS } from "./consts";
import DecksAction from "./DecksAction";
import LeftNavSpacer from "./LeftNavSpacer";
import RecentCardsAction from "./RecentCardsAction";
import { useActiveCardId } from "./useActiveCardId";
import { useActiveCardSummary } from "./useActiveCardSummary";

export default function LeftNavPrimaryActions() {
  const { t } = useI18n();
  const { openTemplatePicker, isTemplatePickerOpen } = useAppActions();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const activeCardId = useActiveCardId({ selectedTemplateId, activeCardIdByTemplate });
  const { currentCardName, currentCardThumbUrl } = useActiveCardSummary(activeCardId);
  const navigate = useNavigate();

  return (
    <>
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
        to="/assets"
        title={t("tooltip.openAssets")}
        ariaLabel={t("tooltip.openAssets")}
      />
    </>
  );
}
