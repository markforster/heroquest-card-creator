"use client";

import { Download, FileText, Image } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "@/app/page.module.css";
import IconLabelMenuButton, {
  type IconLabelMenuButtonHandle,
} from "@/components/common/IconLabelMenuButton";
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

export type DeckExportButtonHandle = {
  toggleMenu: () => boolean;
  closeMenu: () => boolean;
  isMenuOpen: () => boolean;
  runImageExport: () => Promise<boolean>;
  runPdfExport: () => Promise<boolean>;
};

const DeckExportButton = forwardRef<DeckExportButtonHandle, DeckExportButtonProps>(function DeckExportButton({
  deckId,
  scope,
  disabled,
  label,
  className = "btn btn-outline-light btn-sm",
}, ref) {
  const { t } = useI18n();
  const exportContext = useDeckExport();
  const exportDeck = exportContext?.exportDeck;
  const exportDeckPdf = exportContext?.exportDeckPdf;
  const { hasSets } = useDeckHasSets(deckId);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<IconLabelMenuButtonHandle | null>(null);
  const resolvedLabel = label ?? t("decks.actions.exportDeck");

  const baseDisabled = disabled || !deckId || !hasSets || isLoading;
  const isDisabled = baseDisabled || (!exportDeck && !exportDeckPdf);

  const runImageExportAction = useCallback(async () => {
    if (!deckId || isLoading || !exportDeck) return;
    setIsLoading(true);
    try {
      await exportDeck(deckId, scope);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, exportDeck, isLoading, scope]);

  const runPdfExportAction = useCallback(async () => {
    if (!deckId || isLoading || !exportDeckPdf) return;
    setIsLoading(true);
    try {
      await exportDeckPdf(deckId, scope);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, exportDeckPdf, isLoading, scope]);

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
        label: t("decks.actions.exportDeckImages"),
        icon: Image,
        onSelect: runImageExportAction,
      });
    }

    if (exportDeckPdf) {
      items.push({
        id: "export-pdf",
        label: t("decks.actions.exportDeckPdfMenu"),
        icon: FileText,
        onSelect: runPdfExportAction,
      });
    }

    return items;
  }, [exportDeck, exportDeckPdf, runImageExportAction, runPdfExportAction, t]);

  useImperativeHandle(
    ref,
    () => ({
      toggleMenu: () => menuRef.current?.toggleMenu() ?? false,
      closeMenu: () => menuRef.current?.closeMenu() ?? false,
      isMenuOpen: () => menuRef.current?.isMenuOpen() ?? false,
      runImageExport: async () => (await menuRef.current?.selectItem("export-png")) ?? false,
      runPdfExport: async () => (await menuRef.current?.selectItem("export-pdf")) ?? false,
    }),
    [],
  );

  return (
    <IconLabelMenuButton
      ref={menuRef}
      label={resolvedLabel}
      icon={Download}
      disabled={Boolean(isDisabled)}
      ariaLabel={resolvedLabel}
      className={`${styles.inspectorFaceButton} ${className}`.trim()}
      items={menuItems}
    />
  );
});

export default DeckExportButton;
