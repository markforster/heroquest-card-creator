"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AssetHashIndexProvider } from "@/components/Assets/AssetHashIndexProvider";
import { AppActionsProvider } from "@/components/AppActionsContext";
import { CardEditorProvider, useCardEditor } from "@/components/CardEditor/CardEditorContext";
import CardPreviewContainer from "@/components/CardEditor/CardPreviewContainer";
import CardInspector from "@/components/CardInspector/CardInspector";
import TemplateChooser from "@/components/CardInspector/TemplateChooser";
import CardPreview, { type CardPreviewHandle } from "@/components/CardPreview";
import { PreviewCanvasProvider } from "@/components/CardPreview/PreviewCanvasContext";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";
import { EditorSaveProvider } from "@/components/EditorSaveContext";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import { EscapeStackProvider } from "@/components/EscapeStackProvider";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import HeaderWithTemplatePicker from "@/components/HeaderWithTemplatePicker";
import { LibraryTransferProvider } from "@/components/LibraryTransferContext";
import LeftNav from "@/components/LeftNav";
import MainFooter from "@/components/MainFooter";
import { PreviewRendererProvider } from "@/components/PreviewRendererContext";
import { TextFittingPreferencesProvider } from "@/components/TextFittingPreferencesContext";
import ToolsToolbar from "@/components/ToolsToolbar";
import { WebglPreviewSettingsProvider } from "@/components/WebglPreviewSettingsContext";
import dungeonAtmosphere from "@/assets/dungeon atmostphere - 2.png";
import { cardTemplatesById } from "@/data/card-templates";
import { cardDataToCardRecordPatch, cardRecordToCardData } from "@/lib/card-record-mapper";
import { createCard, listCards, updateCard } from "@/lib/cards-db";
import { exportFaceIdsToZip } from "@/lib/export-face-ids";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

import styles from "./page.module.css";

function IndexPageInner() {
  const { t, language } = useI18n();
  const {
    state: { selectedTemplateId, cardDrafts, activeCardIdByTemplate, activeCardStatusByTemplate },
    setActiveCard,
    setTemplateDirty,
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

  const canSaveAsNew = Boolean(currentTemplateId && cardDrafts[currentTemplateId]);
  const canSaveChanges = Boolean(currentTemplateId && activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);
  const [saveToken, setSaveToken] = useState(0);
  const [pairedFrontCount, setPairedFrontCount] = useState(0);
  const [pairedFrontIds, setPairedFrontIds] = useState<string[]>([]);
  const [activeFrontId, setActiveFrontId] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExportingFaces, setIsExportingFaces] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCancelled, setExportCancelled] = useState(false);
  const handleSave = async (mode: "new" | "update") => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const draft = cardDrafts[templateId] as CardDataByTemplate[TemplateId] | undefined;
    if (!draft) return;

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

    const rawTitle =
      (draft && "title" in draft && (draft as { title?: string | null }).title) || "";
    const derivedName = (rawTitle ?? "").toString().trim() || `${templateId} card`;

    const patch = cardDataToCardRecordPatch(templateId, derivedName, draft as never);
    const viewedAt = Date.now();

    let didSave = false;
    try {
      if (mode === "new") {
        const record = await createCard({
          ...patch,
          templateId,
          status: "saved",
          thumbnailBlob,
          name: derivedName,
          lastViewedAt: viewedAt,
        });
        setActiveCard(templateId, record.id, record.status);
        setTemplateDirty(templateId, false);
        didSave = true;
      } else if (mode === "update") {
        if (!activeCardId || activeStatus !== "saved") return;
        const record = await updateCard(activeCardId, {
          ...patch,
          thumbnailBlob,
          lastViewedAt: viewedAt,
        });
        if (record) {
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
    const mode = canSaveChanges ? "update" : canSaveAsNew ? "new" : null;
    if (!mode) return false;
    await handleSave(mode);
    return true;
  };

  const draft = currentTemplateId
    ? (cardDrafts[currentTemplateId] as CardDataByTemplate[TemplateId] | undefined)
    : undefined;
  const effectiveFace = useMemo<CardFace | null>(() => {
    if (!selectedTemplate) return null;
    return (draft?.face ?? selectedTemplate.defaultFace) as CardFace;
  }, [draft?.face, selectedTemplate]);

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
    if (effectiveFace !== "back" || !activeCardId) {
      setPairedFrontCount(0);
      setPairedFrontIds([]);
      setActiveFrontId(null);
      return;
    }
    let active = true;
    listCards({ status: "saved" })
      .then((cards) => {
        if (!active) return;
        const matches = cards.filter((card) => card.pairedWith === activeCardId);
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

  const exportMenuItems = useMemo(() => {
    if (!effectiveFace) return [];
    if (effectiveFace === "front") {
      if (!draft?.pairedWith) return [];
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
  }, [draft?.pairedWith, effectiveFace, pairedFrontCount, t]);

  const exportCurrentFace = () => {
    previewRef.current?.exportAsPng();
  };

  const exportFaceIds = async (faceIds: string[]) => {
    if (faceIds.length <= 1) {
      exportCurrentFace();
      return;
    }
    try {
      setIsExportingFaces(true);
      setExportTotal(faceIds.length);
      setExportProgress(0);
      setExportCancelled(false);
      exportCancelRef.current = false;
      const result = await exportFaceIdsToZip(faceIds, {
        previewRef: exportPreviewRef,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (count) => setExportProgress(count),
        shouldCancel: () => exportCancelRef.current,
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
      if (!draft?.pairedWith) {
        exportCurrentFace();
        return;
      }
      await exportFaceIds([activeCardId, draft.pairedWith]);
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
    <div className={styles.page}>
      <LibraryTransferProvider>
        <EditorSaveProvider value={{ saveCurrentCard, saveToken }}>
          <EscapeStackProvider>
            <AppActionsProvider>
              <HeaderWithTemplatePicker />
              <main className={styles.main}>
                <LeftNav />
                <section
                  className={styles.leftPanel}
                  // style={{ backgroundImage: `url("${dungeonAtmosphere.src}")` }}
                >
                  {/* <div className={styles.templateSidebar}>
                    <TemplatesList
                      selectedId={selectedTemplateId}
                      onSelect={(id) => setSelectedTemplateId(id as TemplateId)}
                      variant="sidebar"
                    />
                  </div> */}
                  <div className={styles.previewContainer}>
                    <ToolsToolbar />
                    {selectedTemplate ? <CardPreviewContainer previewRef={previewRef} /> : null}
                  </div>
                </section>
                <aside className={styles.rightPanel}>
                  <div className={styles.inspectorTop}>
                    <TemplateChooser />
                  </div>
                  <div className={styles.inspectorBody}>
                    <PreviewCanvasProvider previewRef={previewRef}>
                      <CardInspector />
                    </PreviewCanvasProvider>
                  </div>
                  <EditorActionsToolbar
                    canSaveChanges={canSaveChanges}
                    canSaveAsNew={canSaveAsNew}
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
                    onSaveChanges={() => handleSave("update")}
                    onSaveAsNew={() => handleSave("new")}
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
          <PreviewRendererProvider>
            <WebglPreviewSettingsProvider>
              <TextFittingPreferencesProvider>
                <IndexPageInner />
              </TextFittingPreferencesProvider>
            </WebglPreviewSettingsProvider>
          </PreviewRendererProvider>
        </AssetHashIndexProvider>
      </CardEditorProvider>
    </DatabaseVersionGate>
  );
}
