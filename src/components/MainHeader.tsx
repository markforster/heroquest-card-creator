"use client";

import { Images, LayoutTemplate, SquareStack } from "lucide-react";
import Image from "next/image";

import styles from "@/app/page.module.css";
import IconButton from "@/components/IconButton";
import { useI18n } from "@/i18n/I18nProvider";

import appLogo from "../../public/assets/apple-touch-icon.png";

type MainHeaderProps = {
  hasTemplate: boolean;
  currentTemplateName?: string;
  onOpenTemplatePicker: () => void;
  onOpenAssets: () => void;
  onOpenStockpile: () => void;
};

export default function MainHeader({
  hasTemplate,
  currentTemplateName,
  onOpenTemplatePicker,
  onOpenAssets,
  onOpenStockpile,
}: MainHeaderProps) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerTitleRow}>
          <Image
            src={appLogo}
            alt="HeroQuest Card Creator"
            className={styles.headerLogo}
            width={32}
            height={32}
            priority
          />
          <span>{t("app.title")}</span>
        </div>
      </div>
      <div className={styles.headerRight}>
        <IconButton
          className="btn btn-outline-light btn-sm"
          icon={LayoutTemplate}
          disabled={!hasTemplate}
          onClick={onOpenTemplatePicker}
          title="Choose a different card template"
        >
          {t("actions.template")}: {currentTemplateName ?? "Loading..."}
        </IconButton>
        <IconButton
          className="btn btn-outline-light btn-sm"
          icon={Images}
          onClick={onOpenAssets}
          title="Open the assets manager"
        >
          Assets
        </IconButton>
        <IconButton
          className="btn btn-outline-light btn-sm"
          icon={SquareStack}
          onClick={onOpenStockpile}
          title="Browse and load saved cards"
        >
          Cards
        </IconButton>
      </div>
    </header>
  );
}
