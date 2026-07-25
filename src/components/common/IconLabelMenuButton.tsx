"use client";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import type { LucideIcon } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

type IconLabelMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
};

type IconLabelMenuButtonProps = {
  label: string;
  icon: LucideIcon;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  items: IconLabelMenuItem[];
};

export type IconLabelMenuButtonHandle = {
  openMenu: () => boolean;
  closeMenu: () => boolean;
  toggleMenu: () => boolean;
  isMenuOpen: () => boolean;
  selectItem: (itemId: string) => Promise<boolean>;
};

const IconLabelMenuButton = forwardRef<IconLabelMenuButtonHandle, IconLabelMenuButtonProps>(function IconLabelMenuButton({
  label,
  icon: TriggerIcon,
  ariaLabel,
  disabled,
  className,
  items,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePopoverPlacement({
    isOpen,
    anchorRef,
    popoverRef: panelRef,
  });
  useClickOutside(anchorRef, () => setIsOpen(false));

  const isDisabled = Boolean(disabled || !items.length);

  useImperativeHandle(
    ref,
    () => ({
      openMenu: () => {
        if (isDisabled) return false;
        setIsOpen(true);
        return true;
      },
      closeMenu: () => {
        setIsOpen(false);
        return true;
      },
      toggleMenu: () => {
        if (isDisabled) return false;
        setIsOpen((prev) => !prev);
        return true;
      },
      isMenuOpen: () => isOpen,
      selectItem: async (itemId: string) => {
        const item = items.find((entry) => entry.id === itemId);
        if (!item || item.disabled || isDisabled) return false;
        setIsOpen(false);
        await item.onSelect();
        return true;
      },
    }),
    [isDisabled, isOpen, items],
  );

  return (
    <div className={styles.inspectorFaceMenu} ref={anchorRef}>
      <button
        type="button"
        className={className ?? styles.inspectorFaceButton}
        aria-label={ariaLabel ?? label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          setIsOpen((prev) => !prev);
        }}
      >
        <TriggerIcon size={16} className={styles.inspectorFaceItemIcon} />
        <span>{label}</span>
      </button>
      {isOpen ? (
        <div
          ref={panelRef}
          className={`${styles.inspectorFacePopover} ${
            placement === "up" ? styles.inspectorFacePopoverUp : ""
          }`}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.inspectorFaceItem}
              disabled={Boolean(item.disabled)}
              onClick={() => {
                setIsOpen(false);
                void item.onSelect();
              }}
            >
              <item.icon className={styles.inspectorFaceItemIcon} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default IconLabelMenuButton;
