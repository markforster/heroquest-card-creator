"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ExportOptionsForm from "@/components/Export/ExportOptionsForm";
import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import ExportProfilesBottomActionBar from "@/components/Modals/SettingsModal/ExportProfilesBottomActionBar";
import ExportProfileNameModal from "@/components/Modals/SettingsModal/ExportProfileNameModal";
import ExportProfilesTopToolbar from "@/components/Modals/SettingsModal/ExportProfilesTopToolbar";
import { useExportProfilesState } from "@/components/Providers/ExportSettingsContext";
import { useSettingsPanel } from "@/components/Modals/SettingsModal/SettingsModalContext";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { useI18n } from "@/i18n/I18nProvider";
import {
  createExportProfile,
  deleteExportProfile,
  renameExportProfile,
  setDefaultExportProfile,
  updateExportProfile,
} from "@/lib/export-profiles";
import {
  createDefaultExportSettings,
  normalizeBleedPx,
  normalizeColor,
} from "@/lib/export-settings";
import { normalizePdfPrintConfig, type PrintConfig } from "@/lib/pdf-export";

import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { ExportSettings } from "@/lib/export-settings";

type NameModalMode = "create" | "rename" | null;

function cloneExportSettings(settings: ExportSettings): ExportSettings {
  return JSON.parse(JSON.stringify(settings)) as ExportSettings;
}

function createDraftSettings(settings: ExportSettings): ExportSettings {
  return cloneExportSettings(settings);
}

function toExportOptionsState(settings: ExportSettings): ExportOptionsFormState {
  return {
    bleedEnabled: settings.bleed.enabled,
    bleedPx: settings.bleed.bleedPx,
    askBeforeExport: settings.bleed.askBeforeExport,
    roundedCorners: settings.roundedCorners,
    cropMarksEnabled: settings.cropMarks.enabled,
    cropMarkColor: settings.cropMarks.color,
    cropMarkStyle: settings.cropMarks.style,
    cutMarksEnabled: settings.cutMarks.enabled,
    cutMarkColor: settings.cutMarks.color,
    cutMarkStyle: settings.cutMarks.style,
  };
}

function applyExportOptionsChange(
  settings: ExportSettings,
  next: Partial<ExportOptionsFormState>,
): ExportSettings {
  const resolvedBleedEnabled = next.bleedEnabled ?? settings.bleed.enabled;
  const resolvedBleedPx = normalizeBleedPx(next.bleedPx ?? settings.bleed.bleedPx);
  const resolvedAsk = next.askBeforeExport ?? settings.bleed.askBeforeExport;
  const requestedCropEnabled = next.cropMarksEnabled ?? settings.cropMarks.enabled;
  const requestedCutEnabled = next.cutMarksEnabled ?? settings.cutMarks.enabled;
  const resolvedCropEnabled = resolvedBleedEnabled ? requestedCropEnabled : false;
  const resolvedCutEnabled = resolvedBleedEnabled ? requestedCutEnabled : false;

  return {
    bleed: {
      enabled: resolvedBleedEnabled,
      bleedPx: resolvedBleedPx,
      askBeforeExport: resolvedAsk,
    },
    cropMarks: {
      enabled: resolvedCropEnabled,
      color: normalizeColor(next.cropMarkColor ?? settings.cropMarks.color),
      style: next.cropMarkStyle ?? settings.cropMarks.style,
    },
    cutMarks: {
      enabled: resolvedCutEnabled,
      color: normalizeColor(next.cutMarkColor ?? settings.cutMarks.color),
      style: next.cutMarkStyle ?? settings.cutMarks.style,
    },
    roundedCorners: next.roundedCorners ?? settings.roundedCorners,
    pdf: settings.pdf,
  };
}

function areSettingsEqual(left: ExportSettings, right: ExportSettings): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function ExportSettingsPanel() {
  const { t } = useI18n();
  const settingsPanel = useSettingsPanel();
  const {
    isReady,
    profiles,
    selectedProfileId,
    selectedProfile,
    defaultProfile,
    setSelectedProfileId,
    refresh,
  } = useExportProfilesState();

  const [draftSettings, setDraftSettings] = useState<ExportSettings>(createDefaultExportSettings());
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [nameModalMode, setNameModalMode] = useState<NameModalMode>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const activeProfile = selectedProfile ?? defaultProfile;

  useEffect(() => {
    if (!activeProfile) return;
    setDraftSettings(createDraftSettings(activeProfile.settings));
  }, [activeProfile]);

  const isDirty = useMemo(() => {
    if (!activeProfile) return false;
    return !areSettingsEqual(draftSettings, activeProfile.settings);
  }, [activeProfile, draftSettings]);

  useEffect(() => {
    settingsPanel.setBlocked(isDirty, t("confirm.discardSettingsChangesBody"));
    settingsPanel.setSaveHandler(
      isDirty && activeProfile
        ? () => updateExportProfile(activeProfile.id, draftSettings).then(() => refresh())
        : undefined,
    );
    return () => {
      settingsPanel.setBlocked(false);
      settingsPanel.setSaveHandler(undefined);
    };
  }, [activeProfile, draftSettings, isDirty, refresh, settingsPanel, t]);

  const finalSizeLabel = useMemo(() => {
    const bleed = normalizeBleedPx(draftSettings.bleed.bleedPx);
    return `${CARD_WIDTH + bleed * 2} x ${CARD_HEIGHT + bleed * 2}px`;
  }, [draftSettings.bleed.bleedPx]);

  const handleSave = useCallback(async () => {
    if (!activeProfile) return;
    await updateExportProfile(activeProfile.id, draftSettings);
    await refresh();
  }, [activeProfile, draftSettings, refresh]);

  const handleProfileSelect = useCallback(
    async (profileId: string) => {
      if (profileId === activeProfile?.id) return;
      if (isDirty) {
        setPendingProfileId(profileId);
        return;
      }

      await setSelectedProfileId(profileId);
    },
    [activeProfile?.id, isDirty, setSelectedProfileId],
  );

  const resolveNameError = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return t("validation.profileNameRequired");
      }

      const duplicate = profiles.find((profile) => {
        if (nameModalMode === "rename" && profile.id === activeProfile?.id) {
          return false;
        }
        return profile.name.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0;
      });

      if (duplicate) {
        return t("validation.profileNameDuplicate");
      }

      return null;
    },
    [activeProfile?.id, nameModalMode, profiles, t],
  );

  const handleNameModalConfirm = useCallback(
    async (name: string) => {
      if (nameModalMode === "create") {
        await createExportProfile({ name, settings: draftSettings });
        await refresh();
        setNameModalMode(null);
        return;
      }

      if (nameModalMode === "rename" && activeProfile) {
        await renameExportProfile(activeProfile.id, name);
        await refresh();
        setNameModalMode(null);
      }
    },
    [activeProfile, draftSettings, nameModalMode, refresh],
  );

  const handleDelete = useCallback(async () => {
    if (!activeProfile) return;
    await deleteExportProfile(activeProfile.id);
    await refresh();
    setIsDeleteConfirmOpen(false);
  }, [activeProfile, refresh]);

  const handleDiscardPendingProfileSwitch = useCallback(async () => {
    if (!pendingProfileId) return;
    const nextProfileId = pendingProfileId;
    setPendingProfileId(null);
    await setSelectedProfileId(nextProfileId);
  }, [pendingProfileId, setSelectedProfileId]);

  if (!activeProfile && !isReady) {
    return <div className={styles.settingsPanelBody}>{t("status.loading")}</div>;
  }

  const isSelectedDefault = activeProfile?.id === defaultProfile?.id;
  const onlyOneProfile = profiles.length <= 1;
  const selectedProfileIdValue = selectedProfileId ?? activeProfile?.id;

  return (
    <div
      className={`${styles.settingsPanelBody} ${styles.settingsPanelBodyNoScroll} ${styles.exportSettingsPanelLayout}`}
    >
      <ExportProfilesTopToolbar
        profiles={profiles}
        selectedProfileId={selectedProfileIdValue}
        defaultProfileId={defaultProfile?.id}
        isDirty={isDirty}
        disableSelection={!isReady}
        disableSetDefault={isDirty || onlyOneProfile || Boolean(isSelectedDefault)}
        onSelectProfile={(profileId) => {
          void handleProfileSelect(profileId);
        }}
        onSetDefault={() => {
          if (!activeProfile) return;
          void setDefaultExportProfile(activeProfile.id).then(refresh);
        }}
      />

      <div className={styles.exportSettingsScroll}>
        <div className={styles.exportSettingsPanelContent}>
          <ExportOptionsForm
            {...toExportOptionsState(draftSettings)}
            bleedLabelKey="label.exportWithBleed"
            headingLabelKey="heading.exportSettings"
            finalSizeLabel={finalSizeLabel}
            showAskBeforeExport
            useSettingsGroup
            onChange={(next) =>
              setDraftSettings((current) => applyExportOptionsChange(current, next))
            }
          />

          <div className={styles.settingsGroup}>
            <div className={styles.settingsGroupTitle}>{t("decks.meta.pdf.section")}</div>
            <PdfExportConfigForm
              config={draftSettings.pdf}
              onChange={(next: PrintConfig) =>
                setDraftSettings((current) => ({
                  ...current,
                  pdf: normalizePdfPrintConfig(next),
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className={styles.settingsPanelFooter}>
        <ExportProfilesBottomActionBar
          disableSave={!isDirty}
          disableDelete={isDirty || onlyOneProfile || Boolean(isSelectedDefault)}
          onSave={() => {
            void handleSave();
          }}
          onSaveAs={() => setNameModalMode("create")}
          onRename={() => setNameModalMode("rename")}
          onDelete={() => setIsDeleteConfirmOpen(true)}
        />
      </div>

      <ExportProfileNameModal
        isOpen={nameModalMode !== null}
        title={
          nameModalMode === "rename"
            ? t("heading.renameExportProfile")
            : t("heading.createExportProfile")
        }
        confirmLabel={
          nameModalMode === "rename" ? t("actions.rename") : t("actions.saveAs")
        }
        initialValue={nameModalMode === "rename" ? activeProfile?.name ?? "" : ""}
        validateName={resolveNameError}
        onConfirm={handleNameModalConfirm}
        onCancel={() => setNameModalMode(null)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingProfileId)}
        title={t("heading.discardChanges")}
        confirmLabel={t("actions.discard")}
        onConfirm={() => {
          void handleDiscardPendingProfileSwitch();
        }}
        onCancel={() => setPendingProfileId(null)}
      >
        <p className="mb-0">{t("confirm.discardSettingsChangesBody")}</p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={t("heading.deleteExportProfile")}
        confirmLabel={t("actions.delete")}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      >
        <p className="mb-0">{t("confirm.deleteExportProfile")}</p>
      </ConfirmModal>
    </div>
  );
}
