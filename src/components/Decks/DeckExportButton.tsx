"use client";

import { Download, FileText, Image } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import IconLabelMenuButton from "@/components/common/IconLabelMenuButton";
import { useDeckExport } from "@/components/Decks/context/DeckExportContext";
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
  const resolvedLabel = label ?? t("decks.actions.exportDeck");

  const baseDisabled = disabled || !deckId || !hasSets || isLoading;
  const isDisabled = baseDisabled || (!exportDeck && !exportDeckPdf);

  const menuItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      icon: LucideIcon;
      onSelect: () => Promise<void>;
    }> = [];

    if (exportDeck) {
      items.push({
        id: "export-png",
        label: "Image Export",
        icon: Image,
        onSelect: async () => {
          if (!deckId || isLoading || !exportDeck) return;
          setIsLoading(true);
          try {
            await exportDeck(deckId, scope);
          } finally {
            setIsLoading(false);
          }
        },
      });
    }

    if (exportDeckPdf) {
      items.push({
        id: "export-pdf",
        label: "PDF Export",
        icon: FileText,
        onSelect: async () => {
          if (!deckId || isLoading || !exportDeckPdf) return;
          setIsLoading(true);
          try {
            await exportDeckPdf(deckId, scope);
          } finally {
            setIsLoading(false);
          }
        },
      });
    }

    return items;
  }, [deckId, exportDeck, exportDeckPdf, isLoading, scope, t]);

  return (
    <IconLabelMenuButton
      label={resolvedLabel}
      icon={Download}
      disabled={Boolean(isDisabled)}
      ariaLabel={resolvedLabel}
      className={`${styles.inspectorFaceButton} ${className}`.trim()}
      items={menuItems}
    />
  );
}
