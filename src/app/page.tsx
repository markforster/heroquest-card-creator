"use client";

import { useRef, useState } from "react";

import { AssetHashIndexProvider } from "@/components/Assets/AssetHashIndexProvider";
import { AppActionsProvider } from "@/components/AppActionsContext";
import { CardEditorProvider, useCardEditor } from "@/components/CardEditor/CardEditorContext";
import CardPreviewContainer from "@/components/CardEditor/CardPreviewContainer";
import CardInspector from "@/components/CardInspector/CardInspector";
import TemplateChooser from "@/components/CardInspector/TemplateChooser";
import type { CardPreviewHandle } from "@/components/CardPreview";
import { PreviewCanvasProvider } from "@/components/CardPreview/PreviewCanvasContext";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";
import { EditorSaveProvider } from "@/components/EditorSaveContext";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
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
import { cardDataToCardRecordPatch } from "@/lib/card-record-mapper";
import { createCard, updateCard } from "@/lib/cards-db";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import styles from "./page.module.css";

function IndexPageInner() {
  const {
    state: { selectedTemplateId, cardDrafts, activeCardIdByTemplate, activeCardStatusByTemplate },
    setActiveCard,
    setTemplateDirty,
  } = useCardEditor();

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const previewRef = useRef<CardPreviewHandle>(null!);

  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const activeStatus =
    currentTemplateId != null ? activeCardStatusByTemplate[currentTemplateId] : undefined;

  const canSaveAsNew = Boolean(currentTemplateId && cardDrafts[currentTemplateId]);
  const canSaveChanges = Boolean(currentTemplateId && activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);
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
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to save card", error);
    } finally {
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

  return (
    <div className={styles.page}>
      <LibraryTransferProvider>
        <EditorSaveProvider value={{ saveCurrentCard }}>
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
                  onExportPng={() => {
                    previewRef.current?.exportAsPng();
                  }}
                  onSaveChanges={() => handleSave("update")}
                  onSaveAsNew={() => handleSave("new")}
                />
              </aside>
            </main>
          </AppActionsProvider>
        </EditorSaveProvider>
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
