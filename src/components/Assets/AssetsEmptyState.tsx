"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

import { GPT_LINKS, OFFICIAL_ARTWORK_PACK_URL } from "@/components/Assets/assetsResources";

export default function AssetsEmptyState() {
  const { t } = useI18n();

  return (
    <div className={styles.assetsEmptyState}>
      <section className={styles.assetsEmptyStateCard} aria-labelledby="assets-empty-title">
        <h2 id="assets-empty-title" className={styles.assetsEmptyStateTitle}>
          {t("empty.assetsLibraryTitle")}
        </h2>
        <p className={styles.assetsEmptyStateBody}>{t("empty.assetsLibraryBody")}</p>
        <a
          className={styles.assetsEmptyStateCta}
          href={OFFICIAL_ARTWORK_PACK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("empty.assetsDownloadPackCta")}
        </a>
        <p className={styles.assetsEmptyStateBody}>{t("empty.assetsManualIntro")}</p>
        <ol className={styles.assetsEmptyStateSteps}>
          <li>{t("empty.assetsManualStep1")}</li>
          <li>{t("empty.assetsManualStep2")}</li>
          <li>{t("empty.assetsManualStep3")}</li>
          <li>{t("empty.assetsManualStep4")}</li>
        </ol>
        <section className={styles.assetsEmptyStateSecondary} aria-labelledby="assets-empty-gpt-title">
          <h3 id="assets-empty-gpt-title" className={styles.assetsEmptyStateSecondaryTitle}>
            {t("empty.assetsGptHeading")}
          </h3>
          <p className={styles.assetsEmptyStateSecondaryBody}>{t("empty.assetsGptBody")}</p>
          <div className={styles.assetsEmptyStateGptList}>
            {GPT_LINKS.map((link) => (
              <article key={link.href} className={styles.assetsEmptyStateGptCard}>
                <h4 className={styles.assetsEmptyStateGptCardTitle}>{t(link.titleKey)}</h4>
                <p className={styles.assetsEmptyStateGptCardMeta}>{t(link.metaKey)}</p>
                <p className={styles.assetsEmptyStateGptCardBody}>{t(link.bodyKey)}</p>
                <a
                  className={styles.assetsEmptyStateGptCardLink}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(link.ctaKey)}
                </a>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
