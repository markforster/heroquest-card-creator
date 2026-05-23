"use client";

import { Download } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useClickOutside } from "@/components/common/useClickOutside";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import IconButton from "@/components/common/IconButton";
import { useDeckExport } from "@/components/Decks/context/DeckExportContext";
import SplitActionMenu from "@/components/EditorActionsToolbar/SplitActionMenu";
import { useDeckHasSets } from "@/components/Decks/hooks/useDeckHasSets";
import { useI18n } from "@/i18n/I18nProvider";

type DeckExportButtonProps = {
  deckId?: string | null;
  scope: "decks_grid" | "deck_detail";
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function DeckExportButton({
  deckId,
  scope,
  disabled,
  label,
  className = "btn btn-outline-light btn-sm",
}: DeckExportButtonProps) {
  const { t } = useI18n();
  const exportContext = useDeckExport();
  const exportDeck = exportContext?.exportDeck;
  const exportDeckPdf = exportContext?.exportDeckPdf;
  const { hasSets } = useDeckHasSets(deckId);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const resolvedLabel = label ?? t("decks.actions.exportDeck");

  const isDisabled = disabled || !deckId || !hasSets || isLoading || !exportDeck;
  const menuPlacement = usePopoverPlacement({
    isOpen: isMenuOpen,
    anchorRef: menuRef,
    popoverRef: menuPanelRef,
  });
  useClickOutside(menuRef, () => setIsMenuOpen(false));

  const menuItems = useMemo(
    () =>
      exportDeckPdf
        ? [
            {
              id: "export-pdf",
              label: t("decks.actions.exportDeckPdf"),
              onClick: async () => {
                if (!deckId || isLoading) return;
                setIsLoading(true);
                try {
                  await exportDeckPdf(deckId, scope);
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ]
        : [],
    [deckId, exportDeckPdf, isLoading, scope, t],
  );

  if (!menuItems.length) {
    return (
      <IconButton
        className={className}
        icon={Download}
        title={resolvedLabel}
        disabled={Boolean(isDisabled)}
        onClick={async () => {
          if (!deckId || isLoading || !exportDeck) return;
          setIsLoading(true);
          try {
            await exportDeck(deckId, scope);
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {resolvedLabel}
      </IconButton>
    );
  }

  return (
    <SplitActionMenu
      label={resolvedLabel}
      icon={Download}
      disabled={Boolean(isDisabled)}
      onPrimaryClick={async () => {
        if (!deckId || isLoading || !exportDeck) return;
        setIsLoading(true);
        try {
          await exportDeck(deckId, scope);
        } finally {
          setIsLoading(false);
        }
      }}
      menuItems={menuItems}
      isMenuOpen={isMenuOpen}
      onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
      onCloseMenu={() => setIsMenuOpen(false)}
      placement={menuPlacement}
      anchorRef={menuRef}
      panelRef={menuPanelRef}
      chevronAriaLabel={resolvedLabel}
      primaryClassName={className}
    />
  );
}
