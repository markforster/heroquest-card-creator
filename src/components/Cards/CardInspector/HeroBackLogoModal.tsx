"use client";

import { Layers, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import {
  deleteHeroBackLogo,
  getHeroBackLogoUsage,
  listHeroBackLogos,
  type DeleteHeroBackLogoRemediation,
  type HeroBackLogoRecord,
} from "@/lib/hero-back-logos-db";

import HeroBackLogoPreviewTile from "./HeroBackLogoPreviewTile";
import InspectorStateNotice from "./InspectorStateNotice";

type HeroBackLogoModalProps = {
  isOpen: boolean;
  currentLogoId?: string;
  onClose: () => void;
  onDeleted: (
    deletedLogoId: string,
    remediation: DeleteHeroBackLogoRemediation,
    replacement?: HeroBackLogoRecord | null,
    affectedCardIds?: string[],
  ) => void | Promise<void>;
};

type PendingDeleteState = {
  logo: HeroBackLogoRecord;
  usageCount: number;
};

function DeleteRemediationContent({
  alternativeLogos,
  mode,
  replacementId,
  onModeChange,
  onReplacementChange,
}: {
  alternativeLogos: HeroBackLogoRecord[];
  mode: "default" | "custom";
  replacementId: string;
  onModeChange: (mode: "default" | "custom") => void;
  onReplacementChange: (replacementId: string) => void;
}) {
  const { t } = useI18n();
  const defaultOptionId = "hero-back-logo-remediation-default";
  const customOptionId = "hero-back-logo-remediation-custom";

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-column gap-2">
        <label
          htmlFor={defaultOptionId}
          className={`${styles.heroBackLogoRemediationOption} d-flex align-items-start gap-3`}
        >
          <input
            id={defaultOptionId}
            className="form-check-input hq-checkbox"
            type="radio"
            checked={mode === "default"}
            onChange={() => onModeChange("default")}
          />
          <span className={styles.heroBackLogoRemediationLabel}>
            {t("label.useDefaultLogo")}
          </span>
        </label>
        {alternativeLogos.length > 0 ? (
          <>
            <label
              htmlFor={customOptionId}
              className={`${styles.heroBackLogoRemediationOption} d-flex align-items-start gap-3`}
            >
              <input
                id={customOptionId}
                className="form-check-input hq-checkbox"
                type="radio"
                checked={mode === "custom"}
                onChange={() => onModeChange("custom")}
              />
              <span className={styles.heroBackLogoRemediationLabel}>
                {t("label.replaceWithAnotherLogo")}
              </span>
            </label>
            {mode === "custom" ? (
              <div className={styles.heroBackLogoRemediationSelect}>
                <select
                  className="form-select form-select-sm"
                  value={replacementId}
                  onChange={(event) => onReplacementChange(event.target.value)}
                >
                  {alternativeLogos.map((logo) => (
                    <option key={logo.id} value={logo.id}>
                      {logo.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function HeroBackLogoModal({
  isOpen,
  currentLogoId,
  onClose,
  onDeleted,
}: HeroBackLogoModalProps) {
  const { t } = useI18n();
  const [logos, setLogos] = useState<HeroBackLogoRecord[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const [remediationMode, setRemediationMode] = useState<"default" | "custom">("default");
  const [replacementId, setReplacementId] = useState<string>("");

  const reloadLogos = async () => {
    const next = await listHeroBackLogos();
    setLogos(next);
  };

  useEffect(() => {
    if (!isOpen) return;
    void reloadLogos();
    setPendingDelete(null);
  }, [isOpen]);

  const alternatives = useMemo(() => {
    if (!pendingDelete) return [];
    return logos.filter((logo) => logo.id !== pendingDelete.logo.id);
  }, [logos, pendingDelete]);
  const selectedReplacement =
    alternatives.find((logo) => logo.id === replacementId) ?? alternatives[0] ?? null;

  useEffect(() => {
    if (!pendingDelete) {
      setRemediationMode("default");
      setReplacementId("");
      return;
    }

    setRemediationMode("default");
    setReplacementId(alternatives[0]?.id ?? "");
  }, [pendingDelete, alternatives]);

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;

    let remediation: DeleteHeroBackLogoRemediation = { mode: "default" };
    let replacement: HeroBackLogoRecord | null = null;

    if (remediationMode === "custom" && selectedReplacement) {
      remediation = {
        mode: "custom",
        logoId: selectedReplacement.id,
        logoName: selectedReplacement.name,
        width: selectedReplacement.width,
        height: selectedReplacement.height,
      };
      replacement = selectedReplacement;
    }

    setIsBusy(true);
    try {
      const affectedCardIds = await deleteHeroBackLogo(pendingDelete.logo.id, remediation);
      await reloadLogos();
      setPendingDelete(null);
      await onDeleted(pendingDelete.logo.id, remediation, replacement, affectedCardIds);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={() => {
          setPendingDelete(null);
          onClose();
        }}
        title={t("heading.heroBackLogos")}
        footer={
          <div className="d-flex justify-content-end align-items-center gap-2 w-100">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              {t("actions.close")}
            </button>
          </div>
        }
        contentClassName={`${styles.cardsPopover} ${styles.heroBackLogosPopover}`}
      >
        <div className={styles.heroBackLogosModalBody}>
          {logos.length > 0 ? (
            <div className="row g-3 mx-0">
              {logos.map((logo) => (
                <div key={logo.id} className="col-12 col-md-6">
                  <div
                    className={`${styles.stockpileCardTile} ${styles.heroBackLogoCard} ${
                      currentLogoId === logo.id ? styles.heroBackLogoCardCurrent : ""
                    }`}
                  >
                    <HeroBackLogoPreviewTile
                      variant="custom"
                      logoId={logo.id}
                      ariaLabel={logo.name}
                      maxHeight={86}
                    />
                    <div className={styles.heroBackLogoCardMetaRow}>
                      <div className={styles.heroBackLogoCardMeta}>
                        <div className={styles.cardsItemName} title={logo.name}>
                          {logo.name}
                        </div>
                        <div className={styles.cardsItemDetails}>
                          {logo.width} x {logo.height}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn btn-outline-danger btn-sm ${styles.heroBackLogoDeleteButton}`}
                        onClick={() => {
                          void (async () => {
                            const usage = await getHeroBackLogoUsage(logo.id);
                            if (usage.length === 0) {
                              setIsBusy(true);
                              try {
                                const affectedCardIds = await deleteHeroBackLogo(logo.id, { mode: "default" });
                                await reloadLogos();
                                if (currentLogoId === logo.id) {
                                  await onDeleted(logo.id, { mode: "default" }, null, affectedCardIds);
                                }
                              } finally {
                                setIsBusy(false);
                              }
                              return;
                            }

                            setPendingDelete({
                              logo,
                              usageCount: usage.length,
                            });
                          })();
                        }}
                        aria-label={t("actions.delete")}
                        disabled={isBusy}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {logos.length === 0 ? (
            <InspectorStateNotice
              icon={<Layers size={18} aria-hidden="true" />}
              title={t("status.noSavedLogos")}
              body=""
            />
          ) : null}
        </div>
      </ModalShell>
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title={t("confirm.deleteHeroBackLogoTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(null)}
        isConfirming={isBusy}
      >
        {pendingDelete ? (
          <div className="d-flex flex-column gap-3">
            <div>
              {t("confirm.deleteHeroBackLogoInUse").replace(
                "{count}",
                String(pendingDelete.usageCount),
              )}
            </div>
            <DeleteRemediationContent
              alternativeLogos={alternatives}
              mode={remediationMode}
              replacementId={replacementId}
              onModeChange={setRemediationMode}
              onReplacementChange={setReplacementId}
            />
          </div>
        ) : null}
      </ConfirmModal>
    </>
  );
}
