"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import {
  deleteHeroBackLogo,
  getHeroBackLogoUsage,
  listHeroBackLogos,
  type DeleteHeroBackLogoRemediation,
  type HeroBackLogoRecord,
} from "@/lib/hero-back-logos-db";

import HeroBackLogoPreviewTile from "./HeroBackLogoPreviewTile";

type HeroBackLogoModalProps = {
  isOpen: boolean;
  currentLogoId?: string;
  onClose: () => void;
  onDeleted: (
    deletedLogoId: string,
    remediation: DeleteHeroBackLogoRemediation,
    replacement?: HeroBackLogoRecord | null,
  ) => void;
};

type PendingDeleteState = {
  logo: HeroBackLogoRecord;
  usageCount: number;
};

function DeleteRemediationPanel({
  pendingDelete,
  alternativeLogos,
  onCancel,
  onConfirm,
}: {
  pendingDelete: PendingDeleteState;
  alternativeLogos: HeroBackLogoRecord[];
  onCancel: () => void;
  onConfirm: (remediation: DeleteHeroBackLogoRemediation, replacement?: HeroBackLogoRecord | null) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [replacementId, setReplacementId] = useState<string>(alternativeLogos[0]?.id ?? "");
  const selectedReplacement =
    alternativeLogos.find((logo) => logo.id === replacementId) ?? alternativeLogos[0] ?? null;

  useEffect(() => {
    setMode("default");
    setReplacementId(alternativeLogos[0]?.id ?? "");
  }, [pendingDelete.logo.id, alternativeLogos]);

  return (
    <div className="border rounded p-3 mt-3">
      <div className="fw-semibold">{t("confirm.deleteHeroBackLogoTitle")}</div>
      <p className="form-text mb-2">
        {t("confirm.deleteHeroBackLogoInUse").replace("{count}", String(pendingDelete.usageCount))}
      </p>
      <div className="d-flex flex-column gap-2">
        <label className="form-check">
          <input
            className="form-check-input"
            type="radio"
            checked={mode === "default"}
            onChange={() => setMode("default")}
          />
          <span className="form-check-label">{t("label.useDefaultLogo")}</span>
        </label>
        {alternativeLogos.length > 0 ? (
          <>
            <label className="form-check">
              <input
                className="form-check-input"
                type="radio"
                checked={mode === "custom"}
                onChange={() => setMode("custom")}
              />
              <span className="form-check-label">{t("label.replaceWithAnotherLogo")}</span>
            </label>
            {mode === "custom" ? (
              <select
                className="form-select form-select-sm"
                value={replacementId}
                onChange={(event) => setReplacementId(event.target.value)}
              >
                {alternativeLogos.map((logo) => (
                  <option key={logo.id} value={logo.id}>
                    {logo.name}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            if (mode === "custom" && selectedReplacement) {
              onConfirm(
                {
                  mode: "custom",
                  logoId: selectedReplacement.id,
                  logoName: selectedReplacement.name,
                  width: selectedReplacement.width,
                  height: selectedReplacement.height,
                },
                selectedReplacement,
              );
              return;
            }
            onConfirm({ mode: "default" });
          }}
        >
          {t("actions.delete")}
        </button>
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.heroBackLogos")}
      footer={(
        <div className="d-flex justify-content-end align-items-center gap-2 w-100">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            {t("actions.close")}
          </button>
        </div>
      )}
      contentClassName="cardsPopover"
    >
      <div className="form-text mb-3">{t("helper.heroBackLogoManage")}</div>
      <div className="row g-3">
        {logos.map((logo) => (
          <div key={logo.id} className="col-12 col-md-6">
            <div
              className={`border rounded p-2 h-100 ${currentLogoId === logo.id ? "border-secondary" : ""}`}
            >
              <HeroBackLogoPreviewTile
                variant="custom"
                logoId={logo.id}
                ariaLabel={logo.name}
                maxHeight={86}
              />
              <div className="d-flex justify-content-between align-items-start gap-2 mt-2">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold text-truncate">{logo.name}</div>
                  <div className="form-text">
                    {logo.width} x {logo.height}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    void (async () => {
                      const usage = await getHeroBackLogoUsage(logo.id);
                      if (usage.length === 0) {
                        setIsBusy(true);
                        try {
                          await deleteHeroBackLogo(logo.id, { mode: "default" });
                          await reloadLogos();
                          if (currentLogoId === logo.id) {
                            onDeleted(logo.id, { mode: "default" }, null);
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
      {logos.length === 0 ? <div className="form-text">{t("status.noSavedLogos")}</div> : null}
      {pendingDelete ? (
        <DeleteRemediationPanel
          pendingDelete={pendingDelete}
          alternativeLogos={alternatives}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async (remediation, replacement) => {
            setIsBusy(true);
            try {
              await deleteHeroBackLogo(pendingDelete.logo.id, remediation);
              await reloadLogos();
              onDeleted(pendingDelete.logo.id, remediation, replacement);
              setPendingDelete(null);
            } finally {
              setIsBusy(false);
            }
          }}
        />
      ) : null}
    </ModalShell>
  );
}
