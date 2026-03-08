"use client";

import { SquareStack } from "lucide-react";

import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";

export default function CardsAction() {
  const { t } = useI18n();

  return (
    <NavActionButton
      label={t("actions.cards")}
      icon={SquareStack}
      to="/cards"
      end
      title={t("tooltip.openCards")}
      ariaLabel={t("tooltip.openCards")}
    />
  );
}
