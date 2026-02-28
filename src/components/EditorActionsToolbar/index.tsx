"use client";

import { CheckCircle2, CopyPlus, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import IconButton from "@/components/common/IconButton";
import { useClickOutside } from "@/components/common/useClickOutside";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import { useI18n } from "@/i18n/I18nProvider";

import SplitActionMenu from "./SplitActionMenu";

type SavingMode = "new" | "update" | null;

type EditorActionsToolbarProps = {
  canSaveChanges: boolean;
  canDuplicate: boolean;
  savingMode: SavingMode;
  onExportPng: () => void;
  exportMenuItems?: { id: string; label: string; onClick: () => void }[];
  onSaveChanges: () => void;
  onDuplicate: () => void;
  onDuplicateWithPairing: () => void;
};

export default function EditorActionsToolbar({
  canSaveChanges,
  canDuplicate,
  savingMode,
  onExportPng,
  exportMenuItems = [],
  onSaveChanges,
  onDuplicate,
  onDuplicateWithPairing,
}: EditorActionsToolbarProps) {
  const { t } = useI18n();

  const isBusy = savingMode !== null;
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const [isDuplicateMenuOpen, setIsDuplicateMenuOpen] = useState(false);
  const duplicateMenuRef = useRef<HTMLDivElement | null>(null);
  const duplicateMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const hasExportMenu = exportMenuItems.length > 0;
  const exportMenuOptions = useMemo(() => exportMenuItems, [exportMenuItems]);

  const exportMenuPlacement = usePopoverPlacement({
    isOpen: isExportMenuOpen,
    anchorRef: exportMenuRef,
    popoverRef: exportMenuPanelRef,
  });

  const duplicateMenuPlacement = usePopoverPlacement({
    isOpen: isDuplicateMenuOpen,
    anchorRef: duplicateMenuRef,
    popoverRef: duplicateMenuPanelRef,
  });

  useEffect(() => {
    if (!hasExportMenu && isExportMenuOpen) {
      setIsExportMenuOpen(false);
    }
  }, [hasExportMenu, isExportMenuOpen]);

  useClickOutside(exportMenuRef, () => setIsExportMenuOpen(false));
  useClickOutside(duplicateMenuRef, () => setIsDuplicateMenuOpen(false));

  return (
    <div className={`${styles.editorActions} btn-toolbar w-100`} role="toolbar">
      <div className="btn-group me-2" role="group">
        <SplitActionMenu
          label={t("actions.exportPng")}
          icon={Download}
          disabled={isBusy}
          onPrimaryClick={onExportPng}
          menuItems={exportMenuOptions}
          isMenuOpen={isExportMenuOpen}
          onToggleMenu={() => setIsExportMenuOpen((prev) => !prev)}
          onCloseMenu={() => setIsExportMenuOpen(false)}
          placement={exportMenuPlacement}
          anchorRef={exportMenuRef}
          panelRef={exportMenuPanelRef}
          chevronAriaLabel={t("actions.exportPng")}
        />
      </div>
      {canDuplicate ? (
        <div className="btn-group me-2" role="group">
          <SplitActionMenu
            label={t("actions.duplicate")}
            icon={CopyPlus}
            disabled={isBusy}
            onPrimaryClick={onDuplicate}
            menuItems={[
              {
                id: "duplicate-with-pairing",
                label: t("actions.duplicateWithPairing"),
                onClick: onDuplicateWithPairing,
              },
            ]}
            isMenuOpen={isDuplicateMenuOpen}
            onToggleMenu={() => setIsDuplicateMenuOpen((prev) => !prev)}
            onCloseMenu={() => setIsDuplicateMenuOpen(false)}
            placement={duplicateMenuPlacement}
            anchorRef={duplicateMenuRef}
            panelRef={duplicateMenuPanelRef}
            chevronAriaLabel={t("actions.duplicate")}
            primaryClassName={styles.exportSplitPrimary}
          />
        </div>
      ) : null}
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
      </div>
    </div>
  );
}
