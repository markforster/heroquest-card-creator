"use client";

import { CheckCircle2, CopyPlus, Download } from "lucide-react";

import styles from "@/app/page.module.css";
import IconButton from "@/components/IconButton";
import { useI18n } from "@/i18n/I18nProvider";

type SavingMode = "new" | "update" | null;

type EditorActionsToolbarProps = {
  canSaveChanges: boolean;
  canSaveAsNew: boolean;
  savingMode: SavingMode;
  onExportPng: () => void;
  onSaveChanges: () => void;
  onSaveAsNew: () => void;
};

export default function EditorActionsToolbar({
  canSaveChanges,
  canSaveAsNew,
  savingMode,
  onExportPng,
  onSaveChanges,
  onSaveAsNew,
}: EditorActionsToolbarProps) {
  const { t } = useI18n();

  const isBusy = savingMode !== null;

  return (
    <div className={`${styles.editorActions} btn-toolbar w-100`} role="toolbar">
      <div className="btn-group me-2" role="group">
        <IconButton
          className="btn btn-outline-light btn-sm"
          icon={Download}
          disabled={isBusy}
          onClick={onExportPng}
          title={t("tooltip.exportPng")}
        >
          {t("actions.exportPng")}
        </IconButton>
      </div>
      <div className="ms-auto d-flex gap-2" role="group">
        <IconButton
          className="btn btn-primary btn-sm"
          icon={CheckCircle2}
          disabled={!canSaveChanges || isBusy}
          onClick={onSaveChanges}
          title={t("tooltip.saveChanges")}
        >
          {savingMode === "update" ? t("actions.saving") : t("actions.save")}
        </IconButton>
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={CopyPlus}
          disabled={!canSaveAsNew || isBusy}
          onClick={onSaveAsNew}
          title={t("tooltip.saveAsNew")}
        >
          {savingMode === "new" ? t("actions.saving") : t("actions.saveAsNew")}
        </IconButton>
      </div>
    </div>
  );
}
