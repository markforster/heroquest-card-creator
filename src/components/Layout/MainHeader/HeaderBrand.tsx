"use client";

import Image from "next/image";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const APP_LOGO_SRC = "/assets/apple-touch-icon.png";

export default function HeaderBrand() {
  const { t } = useI18n();

  return (
    <div className={styles.headerTitleRow}>
      <Image
        src={APP_LOGO_SRC}
        alt={t("app.title")}
        className={styles.headerLogo}
        width={32}
        height={32}
        priority
      />
      <span>{t("app.title")}</span>
    </div>
  );
}
