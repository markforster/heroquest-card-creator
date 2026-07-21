"use client";

import { useEffect } from "react";

import {
  EDITOR_TARGET_IDS,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { useFooterTip } from "@/components/Providers/FooterTipContext";
import { useI18n } from "@/i18n/I18nProvider";

const CARD_EDITOR_IMAGE_TRANSFORM_TIP_SOURCE = "card-editor-image-transform";

export default function CardEditorFooterTipController() {
  const { t } = useI18n();
  const { selectedTargetId } = useEditorTargets();
  const { setTip, clearTip } = useFooterTip();

  useEffect(() => {
    const isImageTarget =
      selectedTargetId === EDITOR_TARGET_IDS.imageMain ||
      selectedTargetId === EDITOR_TARGET_IDS.imageIcon;

    if (!isImageTarget) {
      clearTip(CARD_EDITOR_IMAGE_TRANSFORM_TIP_SOURCE);
      return;
    }

    setTip(
      CARD_EDITOR_IMAGE_TRANSFORM_TIP_SOURCE,
      t("hint.cardEditorImageTransformPrecision"),
      "lightbulb",
    );
  }, [clearTip, selectedTargetId, setTip, t]);

  useEffect(() => {
    return () => {
      clearTip(CARD_EDITOR_IMAGE_TRANSFORM_TIP_SOURCE);
    };
  }, [clearTip]);

  return null;
}
