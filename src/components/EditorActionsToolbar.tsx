"use client";

import { CheckCircle2, ChevronDown, CopyPlus, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import IconButton from "@/components/IconButton";
import { useI18n } from "@/i18n/I18nProvider";

type SavingMode = "new" | "update" | null;

type EditorActionsToolbarProps = {
  canSaveChanges: boolean;
  canSaveAsNew: boolean;
  savingMode: SavingMode;
  onExportPng: () => void;
  exportMenuItems?: { id: string; label: string; onClick: () => void }[];
  onSaveChanges: () => void;
  onSaveAsNew: () => void;
};

export default function EditorActionsToolbar({
  canSaveChanges,
  canSaveAsNew,
  savingMode,
  onExportPng,
  exportMenuItems = [],
  onSaveChanges,
  onSaveAsNew,
}: EditorActionsToolbarProps) {
  const { t } = useI18n();

  const isBusy = savingMode !== null;
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportMenuPlacement, setExportMenuPlacement] = useState<"down" | "up">("down");
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const hasExportMenu = exportMenuItems.length > 0;
  const exportMenuOptions = useMemo(() => exportMenuItems, [exportMenuItems]);

  useEffect(() => {
    if (!hasExportMenu && isExportMenuOpen) {
      setIsExportMenuOpen(false);
    }
  }, [hasExportMenu, isExportMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isExportMenuOpen) return;

    const updatePlacement = () => {
      const anchor = exportMenuRef.current;
      const menu = exportMenuPanelRef.current;
      if (!anchor || !menu) return;
      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const padding = 12;
      const spaceBelow = window.innerHeight - anchorRect.bottom - padding;
      const spaceAbove = anchorRect.top - padding;
      const needsFlip = menuRect.height > spaceBelow && spaceAbove > spaceBelow;
      setExportMenuPlacement(needsFlip ? "up" : "down");
    };

    const raf = window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isExportMenuOpen, exportMenuOptions.length]);

  return (
    <div className={`${styles.editorActions} btn-toolbar w-100`} role="toolbar">
      <div className="btn-group me-2" role="group">
        <div className={styles.exportSplit} ref={exportMenuRef}>
          <IconButton
            className={`btn btn-outline-light btn-sm ${styles.exportSplitPrimary}`}
            icon={Download}
            disabled={isBusy}
            onClick={onExportPng}
            title={t("tooltip.exportPng")}
          >
            {t("actions.exportPng")}
          </IconButton>
          {hasExportMenu ? (
            <>
              <button
                type="button"
                className={`btn btn-outline-light btn-sm ${styles.exportSplitChevron}`}
                aria-label={t("actions.exportPng")}
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
                disabled={isBusy}
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
              >
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {isExportMenuOpen ? (
                <div
                  className={`${styles.exportSplitMenu} ${
                    exportMenuPlacement === "up" ? styles.exportSplitMenuUp : ""
                  }`}
                  role="menu"
                  ref={exportMenuPanelRef}
                >
                  {exportMenuOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.exportSplitMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        item.onClick();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
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
