"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";
import SettingsDemoPanel from "@/components/SettingsModal/SettingsDemoPanel";
import StatLabelOverridesPanel from "@/components/SettingsModal/StatLabelOverridesPanel";
import {
  SettingsModalProvider,
  SettingsPanelProvider,
  useSettingsModalControls,
} from "@/components/SettingsModal/SettingsModalContext";
import {
  SETTINGS_AREAS,
  SETTINGS_NAV_CONFIG,
} from "@/components/SettingsModal/settings-areas";
import { useI18n } from "@/i18n/I18nProvider";

export type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function SettingsModalContent({
  isOpen,
  activeAreaId,
}: {
  isOpen: boolean;
  activeAreaId: string | null;
}) {
  const { t } = useI18n();
  const { requestClose, requestAreaChange } = useSettingsModalControls();

  const enabledAreas = SETTINGS_AREAS.filter((area) => area.isEnabled !== false);
  const activeArea =
    enabledAreas.find((area) => area.id === activeAreaId) ?? enabledAreas[0] ?? null;
  const showAreaList =
    SETTINGS_NAV_CONFIG.forceShowAreaList || enabledAreas.length > 1;

  const renderActivePanel = () => {
    if (!activeArea) {
      return null;
    }
    switch (activeArea.panelId) {
      case "stat-label-overrides":
        return <StatLabelOverridesPanel />;
      case "settings-demo":
        return <SettingsDemoPanel />;
      default:
        return null;
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={requestClose}
      title=""
      hideHeader
      contentClassName={styles.settingsPopover}
    >
      <div
        className={`${styles.settingsLayout}${showAreaList ? "" : ` ${styles.settingsLayoutSingle}`}`}
      >
        {showAreaList ? (
          <div className={styles.settingsAreaList}>
            {enabledAreas.map((area) => {
              const Icon = area.icon;
              const isActive = area.id === activeArea?.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  className={`${styles.settingsAreaButton}${isActive ? ` ${styles.settingsAreaButtonActive}` : ""}`}
                  onClick={() => requestAreaChange(area.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={styles.settingsAreaIcon} aria-hidden="true" />
                  <span>{t(area.labelKey)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className={styles.settingsPanel}>
          <div className={styles.settingsPanelHeader}>
            <h2 className={styles.settingsPanelTitle}>
              {activeArea ? t(activeArea.labelKey) : ""}
            </h2>
            <button type="button" className={styles.modalCloseButton} onClick={requestClose}>
              <X className={styles.icon} aria-hidden="true" />
              <span className="visually-hidden">{t("actions.close")}</span>
            </button>
          </div>
          <div className={styles.settingsPanelScroll}>
            {activeArea ? (
              <SettingsPanelProvider panelId={activeArea.id}>
                {renderActivePanel()}
              </SettingsPanelProvider>
            ) : null}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstArea = SETTINGS_AREAS.find((area) => area.isEnabled !== false) ?? null;
    setActiveAreaId(firstArea?.id ?? null);
  }, [isOpen]);

  return (
    <SettingsModalProvider
      onClose={onClose}
      onAreaChange={(nextId) => setActiveAreaId(nextId)}
    >
      <SettingsModalContent
        activeAreaId={activeAreaId}
        isOpen={isOpen}
      />
    </SettingsModalProvider>
  );
}
