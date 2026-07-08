"use client";

import styles from "@/app/page.module.css";
import ExportProfileSelect from "@/components/Export/ExportProfileSelect";
import { useI18n } from "@/i18n/I18nProvider";
import type { ExportProfile } from "@/lib/export-profiles";

type ExportProfilesTopToolbarProps = {
  profiles: ExportProfile[];
  selectedProfileId?: string;
  defaultProfileId?: string;
  isDirty: boolean;
  disableSelection?: boolean;
  disableSetDefault: boolean;
  onSelectProfile: (profileId: string) => void;
  onSetDefault: () => void;
};

export default function ExportProfilesTopToolbar({
  profiles,
  selectedProfileId,
  defaultProfileId,
  isDirty,
  disableSelection = false,
  disableSetDefault,
  onSelectProfile,
  onSetDefault,
}: ExportProfilesTopToolbarProps) {
  const { t } = useI18n();

  return (
    <div className={styles.exportProfilesToolbar}>
      <div className={styles.exportProfilesToolbarMain}>
        <div className={styles.exportProfilesToolbarSelect}>
          <ExportProfileSelect
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            defaultProfileId={defaultProfileId}
            disabled={disableSelection}
            ariaLabel={t("label.profile")}
            onChange={onSelectProfile}
          />
        </div>
        {isDirty ? (
          <span className={styles.exportProfilesToolbarBadgeMuted}>{t("status.unsaved")}</span>
        ) : null}
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          disabled={disableSetDefault}
          onClick={onSetDefault}
        >
          {t("actions.setDefault")}
        </button>
      </div>
    </div>
  );
}
