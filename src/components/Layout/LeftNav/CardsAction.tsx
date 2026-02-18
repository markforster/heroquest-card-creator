"use client";

import { SquareStack } from "lucide-react";
import { useMatch } from "react-router-dom";

import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";

export default function CardsAction() {
  const { t } = useI18n();
  const isCardsRoute = Boolean(useMatch("/cards"));

  return (
    <NavActionButton
      label={t("actions.cards")}
      icon={SquareStack}
      to="/cards"
      title={t("tooltip.openCards")}
      ariaLabel={t("tooltip.openCards")}
      isActive={isCardsRoute}
    />
  );
}
