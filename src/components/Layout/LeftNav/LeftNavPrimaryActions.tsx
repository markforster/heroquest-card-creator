"use client";

import { CopyPlus, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import CardThumbnail from "@/components/common/CardThumbnail";
import KeyBinding from "@/components/common/KeyBinding";
import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";
import { releaseLegacyCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import CardsAction from "./CardsAction";
import { SHOW_DECKS } from "./consts";
import DecksAction from "./DecksAction";
import LeftNavSpacer from "./LeftNavSpacer";
import RecentCardsAction from "./RecentCardsAction";
import { useActiveCardId } from "./useActiveCardId";
import { useActiveCardSummary } from "./useActiveCardSummary";

export default function LeftNavPrimaryActions() {
  const { t } = useI18n();
  const { repairCurrentCardThumbnail } = useEditorSave();
  const { openTemplatePicker, isTemplatePickerOpen } = useAppActions();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const activeCardId = useActiveCardId({ selectedTemplateId, activeCardIdByTemplate });
  const { currentCardName, currentCardThumbUrl, retryThumbnail } =
    useActiveCardSummary(activeCardId, repairCurrentCardThumbnail);
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
              className={`${styles.leftNavItem} d-flex align-items-center gap-2 ${styles.leftNavCurrentCard}`}
              onClick={() => navigate(`/cards/${activeCardId}`)}
              title={currentCardName ?? t("actions.cards")}
              aria-label={currentCardName ?? t("actions.cards")}
            >
              <CardThumbnail
                src={currentCardThumbUrl}
                alt=""
                variant="sm"
                fit="cover"
                className={styles.leftNavCurrentCardThumbFrame}
                fallback={<div className={styles.leftNavCurrentCardFallback} />}
                onLoad={
                  !ENABLE_CARD_THUMB_CACHE && currentCardThumbUrl
                    ? () => releaseLegacyCardThumbnailUrl(currentCardThumbUrl)
                    : undefined
                }
                onError={ENABLE_CARD_THUMB_CACHE ? retryThumbnail : undefined}
              />
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
