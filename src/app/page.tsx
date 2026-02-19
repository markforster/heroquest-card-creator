"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useParams,
} from "react-router-dom";

import { AssetHashIndexProvider } from "@/components/Providers/AssetHashIndexProvider";
import { AssetsRoutePanels } from "@/components/Assets";
import { StockpileMainPanel } from "@/components/Stockpile";
import { AppActionsProvider } from "@/components/Providers/AppActionsContext";
import { CardEditorProvider, useCardEditor } from "@/components/Providers/CardEditorContext";
import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";
import CardInspector from "@/components/Cards/CardInspector/CardInspector";
import TemplateChooser from "@/components/Cards/CardInspector/TemplateChooser";
import CardPreview, { type CardPreviewHandle } from "@/components/Cards/CardPreview";
import CardThumbnail from "@/components/common/CardThumbnail";
import { WarningNotice } from "@/components/common/Notice";
import { PreviewCanvasProvider } from "@/components/Providers/PreviewCanvasContext";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";
import { EditorSaveProvider } from "@/components/Providers/EditorSaveContext";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import { EscapeStackProvider } from "@/components/common/EscapeStackProvider";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import HeaderWithTemplatePicker from "@/components/Layout/HeaderWithTemplatePicker";
import { LibraryTransferProvider } from "@/components/Providers/LibraryTransferContext";
import LeftNav from "@/components/Layout/LeftNav";
import MainFooter from "@/components/Layout/MainFooter";
import { DebugVisualsProvider } from "@/components/Providers/DebugVisualsContext";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { PreviewRendererProvider } from "@/components/Providers/PreviewRendererContext";
import { TextFittingPreferencesProvider } from "@/components/Providers/TextFittingPreferencesContext";
import ToolsToolbar from "@/components/ToolsToolbar";
import WelcomeTemplateModal from "@/components/Modals/WelcomeTemplateModal";
import { WebglPreviewSettingsProvider } from "@/components/Providers/WebglPreviewSettingsContext";
import dungeonAtmosphere from "@/assets/dungeon atmostphere - 2.png";
import { cardTemplatesById } from "@/data/card-templates";
import { cardDataToCardRecordPatch, cardRecordToCardData } from "@/lib/card-record-mapper";
import { createCard, getCard, listCards, touchCardLastViewed, updateCard } from "@/lib/cards-db";
import { createPair, deletePairsForFront, listPairsForFace } from "@/lib/pairs-service";
import { exportFaceIdsToZip } from "@/lib/export-face-ids";
import {
  buildMissingAssetsReport,
  type MissingAssetReport,
} from "@/lib/export-assets-cache";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
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
  const isCardDetailRoute = Boolean(useMatch("/cards/:cardId"));
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
    (draftValue && "title" in draftValue && (draftValue as { title?: string | null }).title) ||
    "";
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
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExportingFaces, setIsExportingFaces] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCancelled, setExportCancelled] = useState(false);
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<{
    report: MissingAssetReport[];
    skipIds: Set<string>;
    skipNotes: Map<string, string>;
    onProceed: () => void;
  } | null>(null);
  const [missingAssetsBanner, setMissingAssetsBanner] = useState<{
    count: number;
    report: MissingAssetReport[];
  } | null>(null);
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
    let cancelled = false;
    const schedule = (cb: () => void) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const id = (window as unknown as { requestIdleCallback: (fn: () => void) => number })
          .requestIdleCallback(cb);
        return () => {
          (
            window as unknown as { cancelIdleCallback?: (id: number) => void }
          ).cancelIdleCallback?.(id);
        };
      }
      const id = window.setTimeout(cb, 0);
      return () => window.clearTimeout(id);
    };

    const cancel = schedule(() => {
      void (async () => {
        try {
          const cards = await listCards();
          if (cancelled) return;
          const report = await buildMissingAssetsReport(cards);
          if (cancelled) return;
          if (report.length > 0) {
            setMissingAssetsBanner({ count: report.length, report });
          }
        } catch {
          // Ignore scan failures.
        }
      })();
    });

    return () => {
      cancelled = true;
      cancel?.();
    };
  }, []);

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
      (draftValue &&
        "title" in draftValue &&
        (draftValue as { title?: string | null }).title) ||
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
      (draftValue?.face ?? selectedTemplate?.defaultFace) === "back" ? "back" : "front";
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
        if (saveFace === "front") {
          if (draftPairingBackIds?.length) {
            try {
              await Promise.all(
                draftPairingBackIds.map((backId) => createPair(record.id, backId)),
              );
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
    const mode =
      activeCardId && activeStatus === "saved"
        ? "update"
        : hasDraft
          ? "new"
          : null;
    if (!mode) return false;
    await handleSave(mode);
    return true;
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
      (draftValue &&
        "title" in draftValue &&
        (draftValue as { title?: string | null }).title) ||
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
            new Set(
              pairs
                .map((pair) => pair.backFaceId)
                .filter((id): id is string => Boolean(id)),
            ),
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
    return (draftValue?.face ?? selectedTemplate.defaultFace) as CardFace;
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
    if (!isCardDetailRoute) return;
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
    draft,
    draftTemplateId,
    selectedTemplateId,
    navigate,
    isCardDetailRoute,
  ]);

  useEffect(() => {
    if (!isCardDetailRoute) return;
    if (!cardId) {
      lastLoadedRef.current = null;
      setRouteError(null);
      return;
    }
    if (lastLoadedRef.current === cardId) return;
    lastLoadedRef.current = cardId;
    setRouteError(null);
    const alreadyActive =
      selectedTemplateId != null && activeCardIdByTemplate[selectedTemplateId] === cardId;
    if (alreadyActive) return;

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
    loadCardIntoEditor,
    navigate,
    isCardDetailRoute,
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
    let active = true;
    listCards({ status: "saved" })
      .then(async (cards) => {
        if (!active) return;
        const pairs = await listPairsForFace(activeCardId);
        if (!active) return;
        const frontIds = new Set(
          pairs
            .map((pair) => pair.frontFaceId)
            .filter((id): id is string => Boolean(id)),
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

  const exportCurrentFace = () => {
    if (!activeCardId) {
      previewRef.current?.exportAsPng();
      return;
    }

    void (async () => {
      try {
        const card = await getCard(activeCardId);
        if (!card) {
          previewRef.current?.exportAsPng();
          return;
        }
        const report = await buildMissingAssetsReport([card]);
        if (report.length > 0) {
          setMissingAssetsPrompt({
            report,
            skipIds: new Set(report.map((entry) => entry.cardId)),
            skipNotes: buildSkipNotesFromReport(report),
            onProceed: () => {
              previewRef.current?.exportAsPng();
            },
          });
          return;
        }
        previewRef.current?.exportAsPng();
      } catch {
        previewRef.current?.exportAsPng();
      }
    })();
  };

  const exportFaceIds = async (
    faceIds: string[],
    options?: { skipIds?: Set<string>; skipNotes?: Map<string, string>; skipPrecheck?: boolean },
  ) => {
    if (faceIds.length <= 1) {
      exportCurrentFace();
      return;
    }

    if (!options?.skipPrecheck) {
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
      setExportCancelled(false);
      exportCancelRef.current = false;
      const result = await exportFaceIdsToZip(faceIds, {
        previewRef: exportPreviewRef,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (count) => setExportProgress(count),
        shouldCancel: () => exportCancelRef.current,
        skipCardIds: options?.skipIds,
        skipCardNotes: options?.skipNotes,
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
        <EditorSaveProvider value={{ saveCurrentCard, saveToken }}>
          <EscapeStackProvider>
            <AppActionsProvider>
              <HeaderWithTemplatePicker />
              {missingAssetsBanner ? (
                <div className={styles.missingAssetsBanner}>
                  <WarningNotice
                    role="status"
                    className="d-flex align-items-start gap-3"
                  >
                    <div className={styles.missingAssetsBannerBody}>
                      <div className={styles.missingAssetsBannerTitle}>
                        {t("warning.missingArtworkDetectedTitle")}
                      </div>
                      <div>
                        {formatMessageWith("warning.missingArtworkDetectedBody", {
                          count: missingAssetsBanner.count,
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn btn-outline-light btn-sm ${styles.missingAssetsBannerClose}`}
                      onClick={() => setMissingAssetsBanner(null)}
                    >
                      {t("actions.close")}
                    </button>
                  </WarningNotice>
                </div>
              ) : null}
              <main className={`${styles.main} d-flex`}>
                <LeftNav />
                {isAssetsRoute ? <AssetsRoutePanels /> : null}
                {isCardsListRoute ? (
                  <section className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3`}>
                    <StockpileMainPanel
                      isOpen
                      onClose={() => {}}
                      onLoadCard={(card) => navigate(`/cards/${card.id}`)}
                    />
                  </section>
                ) : null}
                {isCardDetailRoute && routeError ? (
                  <section className={`${styles.routeErrorPanel} d-flex align-items-center justify-content-center`}>
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
                    !isCardDetailRoute || routeError ? styles.routeHidden : ""
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
                    {selectedTemplate ? <CardPreviewContainer previewRef={previewRef} /> : null}
                  </div>
                </section>
                <aside
                  className={`${styles.rightPanel} d-flex flex-column ${
                    !isCardDetailRoute || routeError ? styles.routeHidden : ""
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
                        setIsWelcomeOpen(false);
                      }}
                    />
                  </div>
                  <div className={styles.inspectorBody}>
                    <PreviewCanvasProvider previewRef={previewRef}>
                      <CardInspector />
                    </PreviewCanvasProvider>
                  </div>
                  <EditorActionsToolbar
                    canSaveChanges={canSaveChanges}
                    canDuplicate={canDuplicate}
                    savingMode={savingMode}
                    onExportPng={exportCurrentFace}
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
                      {entry.missing
                        .map((asset) => `${asset.label} \"${asset.name}\"`)
                        .join(", ")}
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
        <ExportProgressOverlay
          isOpen={isExportingFaces}
          title={`${t("status.exportingImages")} (${exportTotal})`}
          progress={exportProgress}
          total={exportTotal}
          cancelLabel={exportCancelled ? t("actions.cancelling") : t("actions.cancel")}
          cancelDisabled={exportCancelled}
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
                    <HashRouter>
                      <Routes>
                        <Route path="/cards" element={<IndexPageInner />} />
                        <Route path="/cards/:cardId" element={<IndexPageInner />} />
                        <Route path="/assets" element={<IndexPageInner />} />
                        <Route path="*" element={<Navigate to="/cards" replace />} />
                      </Routes>
                    </HashRouter>
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
