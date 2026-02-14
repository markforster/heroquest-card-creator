"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import {
  DB_VERSION,
  openHqccDb,
  readExistingHqccDbAppVersion,
  readExistingHqccDbVersion,
} from "@/lib/hqcc-db";
import { APP_VERSION } from "@/version";

import styles from "./DatabaseVersionGate.module.css";

import type { ReactNode } from "react";

type GateStatus = "checking" | "ready" | "blocked";

type Props = {
  children: ReactNode;
};

function isVersionError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "VersionError",
  );
}

export default function DatabaseVersionGate({ children }: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [dbVersion, setDbVersion] = useState<number | null>(null);
  const [dbAppVersion, setDbAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const db = await openHqccDb();
        const version = Number.isFinite(db.version) ? db.version : null;
        db.close();
        if (!cancelled) {
          setDbVersion(version);
          setStatus("ready");
        }
      } catch (error) {
        if (cancelled) return;
        if (isVersionError(error)) {
          try {
            const [version, appVersion] = await Promise.all([
              readExistingHqccDbVersion(),
              readExistingHqccDbAppVersion(),
            ]);
            if (!cancelled) {
              setDbVersion(version);
              setDbAppVersion(appVersion);
              setStatus("blocked");
            }
          } catch {
            if (!cancelled) {
              setDbVersion(null);
              setDbAppVersion(null);
              setStatus("blocked");
            }
          }
          return;
        }

        // Fall back to letting the app load; other errors will surface where relevant.
        // eslint-disable-next-line no-console
        console.error("[DatabaseVersionGate] Failed to verify DB version", error);
        setStatus("ready");
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "ready") {
    return <>{children}</>;
  }

  if (status === "blocked") {
    return (
      <div className={styles.gate} role="alert">
        <div className={styles.panel}>
          <h1 className={styles.title}>{t("heading.databaseVersionMismatch")}</h1>
          <p className={styles.message}>{t("message.databaseVersionMismatch")}</p>
          <dl className={styles.details}>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>{t("label.appVersion")}</dt>
              <dd className={styles.detailValue}>{APP_VERSION}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>{t("label.databaseVersion")}</dt>
              <dd className={styles.detailValue}>{dbVersion ?? t("label.unknownVersion")}</dd>
            </div>
            {dbAppVersion ? (
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>{t("label.databaseAppVersion")}</dt>
                <dd className={styles.detailValue}>{dbAppVersion}</dd>
              </div>
            ) : null}
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>{t("label.expectedDatabaseVersion")}</dt>
              <dd className={styles.detailValue}>{DB_VERSION}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gate}>
      <div className={styles.panel}>
        <p className={styles.message}>{t("ui.loading")}</p>
      </div>
    </div>
  );
}
