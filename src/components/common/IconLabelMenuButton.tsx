"use client";

import styles from "@/app/page.module.css";
import { useClickOutside } from "@/components/common/useClickOutside";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

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

export default function IconLabelMenuButton({
  label,
  icon: TriggerIcon,
  ariaLabel,
  disabled,
  className,
  items,
}: IconLabelMenuButtonProps) {
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
}
