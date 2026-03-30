"use client";

import styles from "@/app/page.module.css";
import { useLibraryTransfer } from "@/components/Providers/LibraryTransferContext";
import { useI18n } from "@/i18n/I18nProvider";

const SAMPLE_LIBRARY_DOWNLOAD_URL =
  "https://github.com/markforster/heroquest-card-creator/releases/download/v0.5.6/heroquest-card-creator_0_5_6--sample-library.hqcc";

export default function StockpileEmptyState() {
  const { t } = useI18n();
  const { openImport, isBusy, isImporting } = useLibraryTransfer();

  return (
    <div className={styles.assetsEmptyState}>
      <section className={styles.assetsEmptyStateCard} aria-labelledby="cards-empty-title">
        <h2 id="cards-empty-title" className={styles.assetsEmptyStateTitle}>
          {t("empty.cardsLibraryTitle")}
        </h2>
        <p className={styles.assetsEmptyStateBody}>{t("empty.cardsLibraryBody")}</p>
        <a
          className="btn btn-outline-secondary btn-sm"
          href={SAMPLE_LIBRARY_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("empty.cardsDownloadLibraryCta")}
        </a>
        <p className={styles.assetsEmptyStateBody}>{t("empty.cardsManualIntro")}</p>
        <ol className={styles.assetsEmptyStateSteps}>
          <li>{t("empty.cardsManualStep1")}</li>
          <li>{t("empty.cardsManualStep2")}</li>
          <li>{t("empty.cardsManualStep3")}</li>
          <li>{t("empty.cardsManualStep4")}</li>
        </ol>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={openImport}
          disabled={isBusy || isImporting}
        >
          {isImporting ? t("actions.importing") : t("actions.importLibrary")}
        </button>
      </section>
    </div>
  );
}
