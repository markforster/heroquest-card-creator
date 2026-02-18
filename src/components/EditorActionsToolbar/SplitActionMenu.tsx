"use client";

import { MoreVertical } from "lucide-react";

import styles from "@/app/page.module.css";
import IconButton from "@/components/common/IconButton";

import type { ComponentType, ReactNode, RefObject } from "react";

type MenuItem = {
  id: string;
  label: string;
  onClick: () => void;
};

type SplitActionMenuProps = {
  label: ReactNode;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  onPrimaryClick: () => void;
  menuItems?: MenuItem[];
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  placement: "up" | "down";
  anchorRef: RefObject<HTMLDivElement>;
  panelRef: RefObject<HTMLDivElement>;
  primaryClassName?: string;
  chevronAriaLabel?: string;
};

export default function SplitActionMenu({
  label,
  icon,
  disabled = false,
  onPrimaryClick,
  menuItems = [],
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  placement,
  anchorRef,
  panelRef,
  primaryClassName,
  chevronAriaLabel,
}: SplitActionMenuProps) {
  const hasMenu = menuItems.length > 0;
  const primaryClasses = `btn btn-outline-light btn-sm ${
    hasMenu ? styles.exportSplitPrimary : ""
  }${primaryClassName ? ` ${primaryClassName}` : ""}`;

  return (
    <div className={styles.exportSplit} ref={anchorRef}>
      <IconButton
        className={primaryClasses}
        icon={icon}
        disabled={disabled}
        onClick={onPrimaryClick}
        title={typeof label === "string" ? label : undefined}
      >
        {label}
      </IconButton>
      {hasMenu ? (
        <>
          <button
            type="button"
            className={`btn btn-outline-light btn-sm ${styles.exportSplitChevron}`}
            aria-label={chevronAriaLabel ?? (typeof label === "string" ? label : undefined)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            disabled={disabled}
            onClick={onToggleMenu}
          >
            <MoreVertical size={16} aria-hidden="true" />
          </button>
          {isMenuOpen ? (
            <div
              className={`${styles.exportSplitMenu} ${
                placement === "up" ? styles.exportSplitMenuUp : ""
              }`}
              role="menu"
              ref={panelRef}
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.exportSplitMenuItem}
                  role="menuitem"
                  onClick={() => {
                    onCloseMenu();
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
  );
}
