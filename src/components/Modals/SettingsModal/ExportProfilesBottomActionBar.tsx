"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type ExportProfilesBottomActionBarProps = {
  disableSave: boolean;
  disableDelete: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export default function ExportProfilesBottomActionBar({
  disableSave,
  disableDelete,
  onSave,
  onSaveAs,
  onRename,
  onDelete,
}: ExportProfilesBottomActionBarProps) {
  const { t } = useI18n();

  return (
    <div className={styles.exportProfilesToolbar}>
      <div className={styles.exportProfilesToolbarActions}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={disableSave}
          onClick={onSave}
        >
          {t("actions.save")}
        </button>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onSaveAs}>
          {t("actions.saveAs")}
        </button>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onRename}>
          {t("actions.rename")}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          disabled={disableDelete}
          onClick={onDelete}
        >
          {t("actions.delete")}
        </button>
      </div>
    </div>
  );
}
