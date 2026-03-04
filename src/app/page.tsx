"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useParams,
} from "react-router-dom";

import { AssetsRoutePanels } from "@/components/Assets";
import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";
import CardInspector from "@/components/Cards/CardInspector/CardInspector";
import TemplateChooser from "@/components/Cards/CardInspector/TemplateChooser";
import CardPreview, { type CardPreviewHandle } from "@/components/Cards/CardPreview";
import CardThumbnail from "@/components/common/CardThumbnail";
import { EscapeStackProvider, useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { WarningNotice } from "@/components/common/Notice";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import HeaderWithTemplatePicker from "@/components/Layout/HeaderWithTemplatePicker";
import LeftNav from "@/components/Layout/LeftNav";
import MainFooter from "@/components/Layout/MainFooter";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import ExportBleedPrompt, { type ExportPromptResult } from "@/components/Modals/ExportBleedPrompt";
import WelcomeTemplateModal from "@/components/Modals/WelcomeTemplateModal";
import { AppActionsProvider } from "@/components/Providers/AppActionsContext";
import { AssetHashIndexProvider } from "@/components/Providers/AssetHashIndexProvider";
import { AssetKindBackfillProvider } from "@/components/Providers/AssetKindBackfillProvider";
import { CardEditorProvider, useCardEditor } from "@/components/Providers/CardEditorContext";
import { DebugVisualsProvider } from "@/components/Providers/DebugVisualsContext";
import { EditorSaveProvider } from "@/components/Providers/EditorSaveContext";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import { LibraryTransferProvider } from "@/components/Providers/LibraryTransferContext";
import {
  LocalStorageProvider,
  useLocalStorageBoolean,
} from "@/components/Providers/LocalStorageProvider";
import {
  MissingAssetsProvider,
  useMissingAssets,
} from "@/components/Providers/MissingAssetsContext";
import { PreviewCanvasProvider } from "@/components/Providers/PreviewCanvasContext";
import { PreviewRendererProvider } from "@/components/Providers/PreviewRendererContext";
import { TextFittingPreferencesProvider } from "@/components/Providers/TextFittingPreferencesContext";
import { WebglPreviewSettingsProvider } from "@/components/Providers/WebglPreviewSettingsContext";
import { StockpileMainPanel } from "@/components/Stockpile";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import ToolsToolbar from "@/components/ToolsToolbar";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveEffectiveFace } from "@/lib/card-face";
import { cardDataToCardRecordPatch, cardRecordToCardData } from "@/lib/card-record-mapper";
import {
  createCard,
  getCard,
  listCards,
  touchCardLastViewed,
  updateCard,
  updateCardThumbnail,
} from "@/lib/cards-db";
import { buildMissingAssetsReport, type MissingAssetReport } from "@/lib/export-assets-cache";
import { exportFaceIdsToZip } from "@/lib/export-face-ids";
import type { ExportSettings } from "@/lib/export-settings";
import { createPair, listPairsForFace } from "@/lib/pairs-service";
import type { CardDataByTemplate } from "@/types/card-data";
import { createDefaultCardData } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

import styles from "./page.module.css";

function IndexPageInner() {
  const { t, language } = useI18n();
  const formatMessageWith = (key: string, vars: Record<string, string | number>) =>
    formatMessage(t(key as never), vars);
  const navigate = useNavigate();
  const { cardId } = useParams();
  const isAssetsRoute = Boolean(useMatch("/assets"));
  const isCardsListRoute = Boolean(useMatch("/cards"));
  const isDraftRoute = Boolean(useMatch("/cards/new"));
  const isCardDetailRoute = Boolean(useMatch("/cards/:cardId"));
  const isSavedCardDetailRoute = isCardDetailRoute && cardId !== "new";
  const isEditorRoute = isDraftRoute || isSavedCardDetailRoute;
  const {
    state: {
      selectedTemplateId,
      draftTemplateId,
      draft,
      draftPairingFrontIds,
      draftPairingBackIds,
      activeCardIdByTemplate,
      activeCardStatusByTemplate,
    },
    setActiveCard,
    setSelectedTemplateId,
    setSingleDraft,
    setDraftPairingFrontIds,
    setDraftPairingBackIds,
    setTemplateDirty,
    loadCardIntoEditor,
  } = useCardEditor();

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const previewRef = useRef<CardPreviewHandle>(null!);
  const exportPreviewRef = useRef<CardPreviewHandle>(null!);
  const exportCancelRef = useRef(false);

  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const activeStatus =
    currentTemplateId != null ? activeCardStatusByTemplate[currentTemplateId] : undefined;

  const hasDraft = Boolean(currentTemplateId && draftTemplateId === currentTemplateId && draft);
  const draftValue =
    currentTemplateId && draftTemplateId === currentTemplateId && draft
      ? (draft as CardDataByTemplate[TemplateId])
      : undefined;
  const rawTitle =
    (draftValue && "title" in draftValue && (draftValue as { title?: string | null }).title) || "";
  const hasTitle = Boolean(rawTitle && rawTitle.toString().trim().length > 0);
  const canSaveChanges = Boolean(
    currentTemplateId && hasTitle && (hasDraft || (activeCardId && activeStatus === "saved")),
  );
  const canDuplicate = Boolean(activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);
  const [saveToken, setSaveToken] = useState(0);
  const [pairedFrontCount, setPairedFrontCount] = useState(0);
  const [pairedFrontIds, setPairedFrontIds] = useState<string[]>([]);
  const [activeFrontId, setActiveFrontId] = useState<string | null>(null);
  const [pairedBackId, setPairedBackId] = useState<string | null>(null);
  const [lastRememberedBackId, setLastRememberedBackId] = useState<string | null>(null);
  const [frontViewToken, setFrontViewToken] = useState(0);
  const lastFaceRef = useRef<CardFace | null>(null);
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExportingFaces, setIsExportingFaces] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSecondaryPercent, setExportSecondaryPercent] = useState<number | null>(null);
  const [exportSecondaryMode, setExportSecondaryMode] = useState<"worker" | "fallback" | null>(
    null,
  );
  const [exportCancelled, setExportCancelled] = useState(false);
  const exportSecondaryModeRef = useRef<"worker" | "fallback" | null>(null);
  const [exportPrompt, setExportPrompt] = useState<{
    resolve: (result: ExportPromptResult | null) => void;
    initial: ExportSettings;
    token: number;
  } | null>(null);
  const { settings: exportSettings } = useExportSettingsState();
  const exportPromptRef = useRef<number | null>(null);
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<{
    report: MissingAssetReport[];
    skipIds: Set<string>;
    skipNotes: Map<string, string>;
    onProceed: () => void;
  } | null>(null);
  const { missingAssetsReport } = useMissingAssets();
  const [missingAssetsDismissed, setMissingAssetsDismissed] = useLocalStorageBoolean(
    "hqcc.missingArtworkBannerDismissed",
    false,
  );
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [routeError, setRouteError] = useState<"not-found" | "load-failed" | null>(null);
  const lastLoadedRef = useRef<string | null>(null);

  useEscapeModalAware({
    id: "route:assets",
    isOpen: isAssetsRoute,
    enabled: isAssetsRoute,
    onEscape: () => {
      if (activeCardId) {
        navigate(`/cards/${activeCardId}`);
      } else {
        navigate("/cards");
      }
    },
  });

  useEffect(() => {
    exportPromptRef.current = exportPrompt ? exportPrompt.token : null;
  }, [exportPrompt]);

  useEscapeModalAware({
    id: "route:cards",
    isOpen: isCardsListRoute,
    enabled: isCardsListRoute,
    onEscape: () => {
      if (activeCardId) {
        navigate(`/cards/${activeCardId}`);
      }
    },
  });
  const handleSave = async (mode: "new" | "update") => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const draftValue =
      draftTemplateId === templateId && draft
        ? (draft as CardDataByTemplate[TemplateId])
        : undefined;
    if (!draftValue) return;
    const draftTitle =
      (draftValue && "title" in draftValue && (draftValue as { title?: string | null }).title) ||
      "";
    if (!draftTitle || !draftTitle.toString().trim()) {
      return;
    }

    const startedAt = Date.now();
    setSavingMode(mode);

    let thumbnailBlob: Blob | null = null;
    try {
      const blob = await previewRef.current?.renderToPngBlob({
        width: 225,
        height: 315,
      });
      thumbnailBlob = blob ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to render thumbnail blob");
    }

    const derivedName = (draftTitle ?? "").toString().trim() || `${templateId} card`;

    const patch = cardDataToCardRecordPatch(templateId, derivedName, draftValue as never);
    const saveFace =
      resolveEffectiveFace(draftValue?.face, selectedTemplate?.defaultFace ?? "front") === "back"
        ? "back"
        : "front";
    const safePatch = patch;
    const viewedAt = Date.now();

    let didSave = false;
    try {
      if (mode === "new") {
        const record = await createCard({
          ...safePatch,
          templateId,
          status: "saved",
          thumbnailBlob,
          name: derivedName,
          lastViewedAt: viewedAt,
        });
        setActiveCard(templateId, record.id, record.status);
        setTemplateDirty(templateId, false);
        navigate(`/cards/${record.id}`, { replace: true });
        if (saveFace === "front") {
          if (draftPairingBackIds?.length) {
            try {
              await Promise.all(draftPairingBackIds.map((backId) => createPair(record.id, backId)));
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("[page] Failed to apply draft back pairings", error);
            }
            setDraftPairingBackIds(null);
          } else if (pairedBackId) {
            await createPair(record.id, pairedBackId);
          }
        }
        if (draftPairingFrontIds?.length) {
          try {
            await Promise.all(
              draftPairingFrontIds.map((frontId) => createPair(frontId, record.id)),
            );
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[page] Failed to apply draft pairings", error);
          }
          setDraftPairingFrontIds(null);
        }
        didSave = true;
      } else if (mode === "update") {
        if (!activeCardId || activeStatus !== "saved") return;
        const record = await updateCard(activeCardId, {
          ...safePatch,
          thumbnailBlob,
          lastViewedAt: viewedAt,
        });
        if (record) {
          if (saveFace === "front") {
            if (draftPairingBackIds?.length) {
              try {
                await Promise.all(
                  draftPairingBackIds.map((backId) => createPair(activeCardId, backId)),
                );
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error("[page] Failed to apply draft back pairings", error);
              }
              setDraftPairingBackIds(null);
            } else if (pairedBackId) {
              await createPair(activeCardId, pairedBackId);
            }
          }
          setActiveCard(templateId, record.id, record.status);
          setTemplateDirty(templateId, false);
          didSave = true;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to save card", error);
    } finally {
      if (didSave) {
        setSaveToken((prev) => prev + 1);
      }
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 300 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSavingMode(null);
    }
  };

  const saveCurrentCard = async () => {
    if (!currentTemplateId) return false;
    const mode = activeCardId && activeStatus === "saved" ? "update" : hasDraft ? "new" : null;
    if (!mode) return false;
    await handleSave(mode);
    return true;
  };

  const repairCurrentCardThumbnail = async () => {
    if (!activeCardId) return false;
    let thumbnailBlob: Blob | null = null;
    try {
      const blob = await previewRef.current?.renderToPngBlob({
        width: 225,
        height: 315,
      });
      thumbnailBlob = blob ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to render thumbnail blob for repair");
    }
    if (!thumbnailBlob) return false;
    try {
      return await updateCardThumbnail(activeCardId, thumbnailBlob);
    } catch {
      return false;
    }
  };

  const nextDuplicateTitle = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return trimmed;
    const match = trimmed.match(/^(.*)\s\((\d+)\)$/);
    if (!match) {
      return `${trimmed} (2)`;
    }
    const base = match[1].trim();
    const suffix = Number(match[2]);
    if (!base || Number.isNaN(suffix)) {
      return `${trimmed} (2)`;
    }
    return `${base} (${suffix + 1})`;
  };

  const duplicateCurrentCard = async (withPairing: boolean) => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    if (!draftValue) return;
    const draftTitle =
      (draftValue && "title" in draftValue && (draftValue as { title?: string | null }).title) ||
      "";
    const nextDraft = {
      ...draftValue,
      ...(draftTitle ? { title: nextDuplicateTitle(String(draftTitle)) } : {}),
    } as CardDataByTemplate[TemplateId];
    if (withPairing && effectiveFace === "back" && pairedFrontIds.length > 0) {
      setDraftPairingFrontIds(pairedFrontIds);
    } else {
      setDraftPairingFrontIds(null);
    }

    if (withPairing && effectiveFace === "front") {
      if (activeCardId) {
        try {
          const pairs = await listPairsForFace(activeCardId);
          const backIds = Array.from(
            new Set(pairs.map((pair) => pair.backFaceId).filter((id): id is string => Boolean(id))),
          );
          setDraftPairingBackIds(backIds.length ? backIds : null);
        } catch {
          setDraftPairingBackIds(null);
        }
      } else {
        setDraftPairingBackIds(draftPairingBackIds ?? null);
      }
    } else {
      setDraftPairingBackIds(null);
    }
    setSelectedTemplateId(templateId);
    setSingleDraft(templateId, nextDraft);
    setActiveCard(templateId, null, null);
    setTemplateDirty(templateId, true);
  };

  const effectiveFace = useMemo<CardFace | null>(() => {
    if (!selectedTemplate) return null;
    return resolveEffectiveFace(draftValue?.face, selectedTemplate.defaultFace);
  }, [draftValue?.face, selectedTemplate]);

  const sortByRecent = (cards: CardRecord[]) =>
    cards.sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) return bViewed - aViewed;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });

  useEffect(() => {
    if (!isCardsListRoute) return;
    if (draftTemplateId && draft) return;
    if (!selectedTemplateId) return;
    const currentTemplate = selectedTemplateId as TemplateId;
    if (activeCardIdByTemplate[currentTemplate]) return;

    let cancelled = false;

    (async () => {
      try {
        const cards = await listCards({ status: "saved" });
        if (cancelled) return;
        if (!cards.length) {
          setIsWelcomeOpen(true);
          return;
        }
        sortByRecent(cards);
        const latest = cards[0];
        if (!latest) return;
        navigate(`/cards/${latest.id}`, { replace: true });
      } catch {
        // Ignore failures; app can still run without auto-restore.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeCardIdByTemplate,
    cardId,
    draft,
    draftTemplateId,
    selectedTemplateId,
    navigate,
    isCardsListRoute,
  ]);

  useEffect(() => {
    if (!isSavedCardDetailRoute) {
      if (isDraftRoute) {
        lastLoadedRef.current = null;
        setRouteError(null);
      }
      return;
    }
    if (!cardId) {
      lastLoadedRef.current = null;
      setRouteError(null);
      return;
    }
    if (lastLoadedRef.current === cardId) return;
    lastLoadedRef.current = cardId;
    setRouteError(null);
    let active = true;
    (async () => {
      try {
        const record = await getCard(cardId);
        if (!active) return;
        if (!record) {
          setRouteError("not-found");
          return;
        }
        const viewed = await touchCardLastViewed(record.id);
        const nextRecord = viewed ?? record;
        setSelectedTemplateId(nextRecord.templateId as TemplateId);
        loadCardIntoEditor(nextRecord.templateId as TemplateId, nextRecord);
        setActiveCard(nextRecord.templateId as TemplateId, nextRecord.id, nextRecord.status);
      } catch {
        if (active) {
          setRouteError("load-failed");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    cardId,
    activeCardIdByTemplate,
    setActiveCard,
    loadCardIntoEditor,
    navigate,
    isDraftRoute,
    isSavedCardDetailRoute,
    selectedTemplateId,
    setSelectedTemplateId,
  ]);

  useEffect(() => {
    if (effectiveFace !== "back" || !activeCardId) {
      setPairedFrontCount(0);
      setPairedFrontIds([]);
      setActiveFrontId(null);
      return;
    }
    setLastRememberedBackId(activeCardId);
    let active = true;
    listCards({ status: "saved" })
      .then(async (cards) => {
        if (!active) return;
        const pairs = await listPairsForFace(activeCardId);
        if (!active) return;
        const frontIds = new Set(
          pairs.map((pair) => pair.frontFaceId).filter((id): id is string => Boolean(id)),
        );
        const matches = cards.filter((card) => frontIds.has(card.id));
        sortByRecent(matches);
        setPairedFrontCount(matches.length);
        setPairedFrontIds(matches.map((card) => card.id));
        setActiveFrontId(matches[0]?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setPairedFrontCount(0);
        setPairedFrontIds([]);
        setActiveFrontId(null);
      });
    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace]);

  useEffect(() => {
    if (effectiveFace !== "front" || !activeCardId) {
      setPairedBackId(null);
      return;
    }
    let active = true;
    const loadPairedBack = async () => {
      const pairs = await listPairsForFace(activeCardId);
      if (!active) return;
      const match =
        pairs.find((pair) => pair.frontFaceId === activeCardId && pair.backFaceId) ??
        pairs.find((pair) => pair.backFaceId);
      setPairedBackId(match?.backFaceId ?? null);
    };
    loadPairedBack().catch(() => {
      if (!active) return;
      setPairedBackId(null);
    });
    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace]);

  useEffect(() => {
    const previousFace = lastFaceRef.current;
    if (previousFace === "back" && effectiveFace === "front") {
      setFrontViewToken((prev) => prev + 1);
    }
    lastFaceRef.current = effectiveFace;
  }, [effectiveFace]);

  const exportMenuItems = useMemo(() => {
    if (!effectiveFace) return [];
    if (effectiveFace === "front") {
      if (!pairedBackId) return [];
      return [
        {
          id: "export-both-faces",
          label: t("label.exportBothFaces"),
        },
      ];
    }
    if (effectiveFace === "back") {
      if (pairedFrontCount <= 0) return [];
      if (pairedFrontCount === 1) {
        return [
          {
            id: "export-both-faces",
            label: t("label.exportBothFaces"),
          },
        ];
      }
      return [
        {
          id: "export-back-active-front",
          label: t("label.exportFaceAndActiveFront"),
        },
        {
          id: "export-back-all-fronts",
          label: t("label.exportFaceAndAllFronts"),
        },
      ];
    }
    return [];
  }, [effectiveFace, pairedBackId, pairedFrontCount, t]);

  const requestExportOptions = async (): Promise<ExportPromptResult | null> => {
    const settings = exportSettings;
    const resolveFromSettings = (): ExportPromptResult => ({
      bleedPx: settings.bleed.enabled ? settings.bleed.bleedPx : 0,
      cropMarks: {
        enabled: settings.bleed.enabled ? settings.cropMarks.enabled : false,
        color: settings.cropMarks.color,
        style: settings.cropMarks.style ?? "lines",
      },
      cutMarks: {
        enabled: settings.cutMarks.enabled,
        color: settings.cutMarks.color,
      },
      roundedCorners: settings.roundedCorners,
    });
    if (!settings.bleed.askBeforeExport) {
      return resolveFromSettings();
    }

    return new Promise<ExportPromptResult | null>((resolve) => {
      const token = Date.now() + Math.random();
      setExportPrompt({ resolve, initial: settings, token });
      let resolved = false;
      const safeResolve = (result: ExportPromptResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };
      window.setTimeout(() => {
        if (exportPromptRef.current !== token) {
          setExportPrompt(null);
          safeResolve(resolveFromSettings());
        }
      }, 0);
    });
  };

  const openCardInNewTab = (cardIdToOpen: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#/cards/${cardIdToOpen}`;
    window.open(url, "_blank", "noopener");
  };

  const buildSkipNotesFromReport = (report: MissingAssetReport[]) => {
    const notes = new Map<string, string>();
    report.forEach((entry) => {
      const missingSummary = entry.missing
        .map((asset) => `${asset.label} asset \"${asset.name}\" (id=${asset.id})`)
        .join(", ");
      notes.set(
        entry.cardId,
        `Card \"${entry.title}\" (id=${entry.cardId}, template=${entry.templateId}, face=${entry.face}) could not be exported because the ${missingSummary}.`,
      );
    });
    return notes;
  };

  const isExportPromptResult = (value: unknown): value is ExportPromptResult => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<ExportPromptResult>;
    if (typeof candidate.bleedPx !== "number") return false;
    const crop = candidate.cropMarks;
    if (!crop || typeof crop !== "object") return false;
    if (typeof crop.enabled !== "boolean") return false;
    if (typeof crop.color !== "string") return false;
    if (crop.style && crop.style !== "lines" && crop.style !== "squares") return false;
    const cut = candidate.cutMarks;
    if (!cut || typeof cut !== "object") return false;
    if (typeof cut.enabled !== "boolean") return false;
    if (typeof cut.color !== "string") return false;
    if (typeof candidate.roundedCorners !== "boolean") return false;
    return true;
  };

  const exportCurrentFace = (exportOptions?: ExportPromptResult | unknown) => {
    const resolvedOptions = isExportPromptResult(exportOptions) ? exportOptions : undefined;
    void (async () => {
      const resolved = resolvedOptions ?? (await requestExportOptions());
      if (!resolved) return;

      if (!activeCardId) {
        previewRef.current?.exportAsPng(resolved);
        return;
      }

      try {
        const card = await getCard(activeCardId);
        if (!card) {
          previewRef.current?.exportAsPng(resolved);
          return;
        }
        if (ENABLE_MISSING_ASSET_CHECKS) {
          const report = await buildMissingAssetsReport([card]);
          if (report.length > 0) {
            setMissingAssetsPrompt({
              report,
              skipIds: new Set(report.map((entry) => entry.cardId)),
              skipNotes: buildSkipNotesFromReport(report),
              onProceed: () => {
                previewRef.current?.exportAsPng(resolved);
              },
            });
            return;
          }
        }
        previewRef.current?.exportAsPng(resolved);
      } catch {
        previewRef.current?.exportAsPng(resolved);
      }
    })();
  };

  const exportFaceIds = async (
    faceIds: string[],
    options?: {
      skipIds?: Set<string>;
      skipNotes?: Map<string, string>;
      skipPrecheck?: boolean;
      exportOptions?: ExportPromptResult;
    },
  ) => {
    const resolvedExportOptions = options?.exportOptions ?? (await requestExportOptions());
    if (!resolvedExportOptions) return;

    if (faceIds.length <= 1) {
      exportCurrentFace(resolvedExportOptions);
      return;
    }

    if (ENABLE_MISSING_ASSET_CHECKS && !options?.skipPrecheck) {
      const records = await Promise.all(
        faceIds.map(async (id) => {
          try {
            return await getCard(id);
          } catch {
            return null;
          }
        }),
      );
      const cards = records.filter((record): record is CardRecord => Boolean(record));
      const report = await buildMissingAssetsReport(cards);
      if (report.length > 0) {
        const skipIds = new Set(report.map((entry) => entry.cardId));
        const skipNotes = buildSkipNotesFromReport(report);
        setMissingAssetsPrompt({
          report,
          skipIds,
          skipNotes,
          onProceed: () => {
            void exportFaceIds(faceIds, { skipIds, skipNotes, skipPrecheck: true });
          },
        });
        return;
      }
    }
    try {
      setIsExportingFaces(true);
      const skipIds = options?.skipIds;
      const total = skipIds ? faceIds.filter((id) => !skipIds.has(id)).length : faceIds.length;
      setExportTotal(total);
      setExportProgress(0);
      setExportSecondaryPercent(null);
      setExportSecondaryMode(null);
      exportSecondaryModeRef.current = null;
      setExportCancelled(false);
      exportCancelRef.current = false;
      const result = await exportFaceIdsToZip(faceIds, {
        previewRef: exportPreviewRef,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (count) => setExportProgress(count),
        onZipProgress: (percent) => {
          if (exportSecondaryModeRef.current === "fallback") return;
          setExportSecondaryPercent(percent);
        },
        onZipStatus: (mode) => {
          setExportSecondaryMode(mode);
          exportSecondaryModeRef.current = mode;
          if (mode === "fallback") {
            setExportSecondaryPercent(null);
          }
        },
        shouldCancel: () => exportCancelRef.current,
        skipCardIds: options?.skipIds,
        skipCardNotes: options?.skipNotes,
        bleedPx: resolvedExportOptions.bleedPx,
        cropMarks: resolvedExportOptions.cropMarks,
        cutMarks: resolvedExportOptions.cutMarks,
        roundedCorners: resolvedExportOptions.roundedCorners,
      });
      if (result.status === "empty") {
        window.alert(t("alert.selectCardToExport"));
      } else if (result.status === "no-images") {
        window.alert(t("alert.noImagesExported"));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to export faces", error);
      window.alert(t("alert.exportImagesFailed"));
    } finally {
      setIsExportingFaces(false);
      setExportTarget(null);
      setExportTotal(0);
      setExportProgress(0);
      setExportSecondaryPercent(null);
      setExportSecondaryMode(null);
      exportSecondaryModeRef.current = null;
      setExportCancelled(false);
    }
  };

  const handleExportBothFaces = async () => {
    if (!activeCardId) {
      exportCurrentFace();
      return;
    }
    if (effectiveFace === "front") {
      if (!pairedBackId) {
        exportCurrentFace();
        return;
      }
      await exportFaceIds([activeCardId, pairedBackId]);
      return;
    }
    if (effectiveFace === "back") {
      const pairedId = pairedFrontIds[0];
      if (!pairedId) {
        exportCurrentFace();
        return;
      }
      await exportFaceIds([activeCardId, pairedId]);
    }
  };

  const handleExportBackActiveFront = async () => {
    if (!activeCardId || !activeFrontId) {
      exportCurrentFace();
      return;
    }
    await exportFaceIds([activeCardId, activeFrontId]);
  };

  const handleExportBackAllFronts = async () => {
    if (!activeCardId || pairedFrontIds.length === 0) {
      exportCurrentFace();
      return;
    }
    await exportFaceIds([activeCardId, ...pairedFrontIds]);
  };

  const exportTemplate = exportTarget ? cardTemplatesById[exportTarget.templateId] : null;
  const exportTemplateName =
    exportTemplate && exportTarget ? getTemplateNameLabel(language, exportTemplate) : "";
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget) : undefined;

  return (
    <div className={`${styles.page} d-flex flex-column`}>
      <LibraryTransferProvider>
        <EditorSaveProvider value={{ saveCurrentCard, repairCurrentCardThumbnail, saveToken }}>
          <EscapeStackProvider>
            <AssetKindBackfillProvider>
              <AppActionsProvider>
                <HeaderWithTemplatePicker
                  missingAssetsCount={missingAssetsReport.length}
                  showMissingAssetsReminder={
                    missingAssetsDismissed && missingAssetsReport.length > 0
                  }
                />
                {ENABLE_MISSING_ASSET_CHECKS &&
                missingAssetsReport.length > 0 &&
                !missingAssetsDismissed ? (
                  <div className={styles.missingAssetsBanner}>
                    <WarningNotice role="status" className="d-flex align-items-start gap-3">
                      <Link className={styles.missingAssetsBannerLink} to="/cards?missingartwork">
                        <div className={styles.missingAssetsBannerBody}>
                          <div className={styles.missingAssetsBannerTitle}>
                            {t("warning.missingArtworkDetectedTitle")}
                          </div>
                          <div>
                            {formatMessageWith("warning.missingArtworkDetectedBody", {
                              count: missingAssetsReport.length,
                            })}
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={`btn btn-outline-light btn-sm ${styles.missingAssetsBannerClose}`}
                        onClick={() => setMissingAssetsDismissed(true)}
                      >
                        {t("actions.dismiss")}
                      </button>
                    </WarningNotice>
                  </div>
                ) : null}
                <main className={`${styles.main} d-flex`}>
                  <LeftNav />
                  {isAssetsRoute ? <AssetsRoutePanels /> : null}
                  {isCardsListRoute ? (
                    <section className={`${styles.leftPanel} d-flex align-items-stretch`}>
                      <StockpileMainPanel
                        isOpen
                        onClose={() => {}}
                        onLoadCard={(card) => navigate(`/cards/${card.id}`)}
                      />
                    </section>
                  ) : null}
                  {isSavedCardDetailRoute && routeError ? (
                    <section
                      className={`${styles.routeErrorPanel} d-flex align-items-center justify-content-center`}
                    >
                      <div className={`${styles.routeErrorCard} ${styles.uStackLg}`}>
                        <div className={styles.routeErrorTitle}>Card not found</div>
                        <div className={styles.routeErrorBody}>
                          {routeError === "not-found"
                            ? "The card you requested does not exist or was deleted."
                            : "We couldn't load this card right now."}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate("/cards", { replace: true })}
                        >
                          Back to cards
                        </button>
                      </div>
                    </section>
                  ) : null}
                  <section
                    className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3 ${
                      !isEditorRoute || routeError ? styles.routeHidden : ""
                    }`}
                    // style={{ backgroundImage: `url("${dungeonAtmosphere.src}")` }}
                  >
                    {/* <div className={styles.templateSidebar}>
                    <TemplatesList
                      selectedId={selectedTemplateId}
                      onSelect={(id) => setSelectedTemplateId(id as TemplateId)}
                      variant="sidebar"
                    />
                  </div> */}
                    <div
                      className={`${styles.previewContainer} d-flex align-items-center justify-content-center`}
                    >
                      <ToolsToolbar />
                      {selectedTemplate ? (
                        <CardPreviewContainer
                          previewRef={previewRef}
                          preferredBackId={lastRememberedBackId}
                        />
                      ) : null}
                    </div>
                  </section>
                  <aside
                    className={`${styles.rightPanel} d-flex flex-column ${
                      !isEditorRoute || routeError ? styles.routeHidden : ""
                    }`}
                  >
                    <div className={styles.inspectorTop}>
                      <TemplateChooser />
                      <WelcomeTemplateModal
                        isOpen={isWelcomeOpen}
                        onClose={() => setIsWelcomeOpen(false)}
                        onSelect={(templateId) => {
                          const nextDraft = createDefaultCardData(templateId);
                          setSelectedTemplateId(templateId);
                          setSingleDraft(templateId, nextDraft);
                          setActiveCard(templateId, null, null);
                          setTemplateDirty(templateId, false);
                          navigate("/cards/new", { replace: true });
                          setIsWelcomeOpen(false);
                        }}
                      />
                    </div>
                    <div className={styles.inspectorBody}>
                      <PreviewCanvasProvider previewRef={previewRef}>
                        <CardInspector
                          activeFrontId={activeFrontId}
                          autoOpenBackId={lastRememberedBackId}
                          frontViewToken={frontViewToken}
                          onRememberBackId={setLastRememberedBackId}
                        />
                      </PreviewCanvasProvider>
                    </div>
                    <EditorActionsToolbar
                      canSaveChanges={canSaveChanges}
                      canDuplicate={canDuplicate}
                      savingMode={savingMode}
                      onExportPng={() => exportCurrentFace()}
                      exportMenuItems={exportMenuItems.map((item) => ({
                        ...item,
                        onClick: () => {
                          if (item.id === "export-both-faces") {
                            void handleExportBothFaces();
                          } else if (item.id === "export-back-active-front") {
                            void handleExportBackActiveFront();
                          } else if (item.id === "export-back-all-fronts") {
                            void handleExportBackAllFronts();
                          }
                        },
                      }))}
                      onSaveChanges={() => {
                        void saveCurrentCard();
                      }}
                      onDuplicate={() => duplicateCurrentCard(false)}
                      onDuplicateWithPairing={() => duplicateCurrentCard(true)}
                    />
                  </aside>
                </main>
              </AppActionsProvider>
            </AssetKindBackfillProvider>
          </EscapeStackProvider>
        </EditorSaveProvider>
        {exportTemplate && exportTarget ? (
          <div className={styles.bulkExportPreview} aria-hidden="true">
            <CardPreview
              ref={exportPreviewRef}
              templateId={exportTemplate.id}
              templateName={exportTemplateName}
              backgroundSrc={exportTemplate.background}
              cardData={exportCardData}
            />
          </div>
        ) : null}
        {missingAssetsPrompt ? (
          <ConfirmModal
            isOpen={Boolean(missingAssetsPrompt)}
            title={t("warning.missingAssetsTitle")}
            confirmLabel={t("actions.proceedExport")}
            cancelLabel={t("actions.cancel")}
            contentClassName={styles.missingAssetsModal}
            onConfirm={() => {
              const prompt = missingAssetsPrompt;
              if (!prompt) return;
              setMissingAssetsPrompt(null);
              prompt.onProceed();
            }}
            onCancel={() => {
              setMissingAssetsPrompt(null);
            }}
          >
            <div>{t("warning.missingAssetsBody")}</div>
            <div className={styles.assetsReportStatus}>{t("label.opensInNewTab")}</div>
            <div className={styles.assetsReportList}>
              {missingAssetsPrompt.report.map((entry) => {
                const thumbUrl = entry.thumbnailBlob
                  ? URL.createObjectURL(entry.thumbnailBlob)
                  : null;
                const fallbackUrl = cardTemplatesById[entry.templateId]?.thumbnail?.src ?? null;
                return (
                  <div key={entry.cardId} className={styles.assetsReportItem}>
                    <div className="d-flex align-items-center gap-3">
                      <CardThumbnail
                        src={thumbUrl ?? fallbackUrl}
                        alt={entry.title}
                        variant="sm"
                        onLoad={() => {
                          if (thumbUrl) {
                            URL.revokeObjectURL(thumbUrl);
                          }
                        }}
                      />
                      <div className={styles.assetsReportName}>
                        {entry.title} ({entry.templateId})
                      </div>
                    </div>
                    <div className={styles.assetsReportStatus}>
                      {t("label.missingAssets")}:{" "}
                      {entry.missing.map((asset) => `${asset.label} \"${asset.name}\"`).join(", ")}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-light btn-sm mt-2"
                      onClick={() => openCardInNewTab(entry.cardId)}
                    >
                      {t("actions.openCardNewTab")}
                    </button>
                  </div>
                );
              })}
            </div>
          </ConfirmModal>
        ) : null}
        {exportPrompt ? (
          <ExportBleedPrompt
            isOpen={Boolean(exportPrompt)}
            initialBleedEnabled={exportPrompt.initial.bleed.enabled}
            initialBleedPx={exportPrompt.initial.bleed.bleedPx}
            initialCropMarksEnabled={exportPrompt.initial.cropMarks.enabled}
            initialCropMarkColor={exportPrompt.initial.cropMarks.color}
            initialCropMarkStyle={exportPrompt.initial.cropMarks.style ?? "lines"}
            initialCutMarksEnabled={exportPrompt.initial.cutMarks.enabled}
            initialCutMarkColor={exportPrompt.initial.cutMarks.color}
            initialRoundedCorners={exportPrompt.initial.roundedCorners}
            onConfirm={(result) => {
              const prompt = exportPrompt;
              if (!prompt) return;
              setExportPrompt(null);
              prompt.resolve(result);
            }}
            onCancel={() => {
              const prompt = exportPrompt;
              if (!prompt) return;
              setExportPrompt(null);
              prompt.resolve(null);
            }}
          />
        ) : null}
        <ExportProgressOverlay
          isOpen={isExportingFaces}
          title={`${t("status.exportingImages")} (${exportTotal})`}
          progress={exportProgress}
          total={exportTotal}
          secondaryLabel={exportSecondaryMode ? t("status.finalizing") : null}
          secondaryPercent={exportSecondaryMode === "worker" ? exportSecondaryPercent : null}
          exportCancelled={exportCancelled}
          onCancel={() => {
            exportCancelRef.current = true;
            setExportCancelled(true);
          }}
        />
        <MainFooter />
      </LibraryTransferProvider>
    </div>
  );
}

export default function IndexPage() {
  return (
    <DatabaseVersionGate>
      <CardEditorProvider>
        <AssetHashIndexProvider>
          <LocalStorageProvider>
            <DebugVisualsProvider>
              <PreviewRendererProvider>
                <WebglPreviewSettingsProvider>
                  <TextFittingPreferencesProvider>
                    <MissingAssetsProvider>
                      <HashRouter>
                        <Routes>
                          <Route path="/cards" element={<IndexPageInner />} />
                          <Route path="/cards/new" element={<IndexPageInner />} />
                          <Route path="/cards/:cardId" element={<IndexPageInner />} />
                          <Route path="/assets" element={<IndexPageInner />} />
                          <Route path="*" element={<Navigate to="/cards" replace />} />
                        </Routes>
                      </HashRouter>
                    </MissingAssetsProvider>
                  </TextFittingPreferencesProvider>
                </WebglPreviewSettingsProvider>
              </PreviewRendererProvider>
            </DebugVisualsProvider>
          </LocalStorageProvider>
        </AssetHashIndexProvider>
      </CardEditorProvider>
    </DatabaseVersionGate>
  );
}
