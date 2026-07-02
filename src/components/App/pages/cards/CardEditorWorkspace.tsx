"use client";

import styles from "@/app/page.module.css";
import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";
import { EditorTargetsProvider } from "@/components/Cards/CardEditor/EditorTargetsContext";
import CardInspector from "@/components/Cards/CardInspector/CardInspector";
import TemplateChooser from "@/components/Cards/CardInspector/TemplateChooser";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import { PreviewCanvasProvider } from "@/components/Providers/PreviewCanvasContext";
import ToolsToolbar from "@/components/ToolsToolbar";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

type CardEditorWorkspaceProps = {
  activeFrontId: string | null;
  canDuplicate: boolean;
  canSaveChanges: boolean;
  draftSourceCardId: string | null;
  exportMenuItems: Array<{ id: string; label: string; onClick: () => void }>;
  frontViewToken: number;
  onBackToCards: () => void;
  onDuplicate: () => void;
  onDuplicateWithPairing: () => void;
  onExportPng: () => void;
  onRememberBackId: (cardId: string | null) => void;
  onSaveChanges: () => void;
  preferredBackId: string | null;
  previewRef: React.RefObject<CardPreviewHandle>;
  routeError: "not-found" | "load-failed" | null;
  savingMode: "new" | "update" | null;
  selectedTemplateId?: TemplateId;
};

export default function CardEditorWorkspace({
  activeFrontId,
  canDuplicate,
  canSaveChanges,
  draftSourceCardId,
  exportMenuItems,
  frontViewToken,
  onBackToCards,
  onDuplicate,
  onDuplicateWithPairing,
  onExportPng,
  onRememberBackId,
  onSaveChanges,
  preferredBackId,
  previewRef,
  routeError,
  savingMode,
  selectedTemplateId,
}: CardEditorWorkspaceProps) {
  const { t } = useI18n();

  if (routeError) {
    return (
      <section
        className={`${styles.routeErrorPanel} d-flex align-items-center justify-content-center`}
      >
        <div className={`${styles.routeErrorCard} ${styles.uStackLg}`}>
          <div className={styles.routeErrorTitle}>{t("routeError.cardNotFoundTitle")}</div>
          <div className={styles.routeErrorBody}>
            {routeError === "not-found"
              ? t("routeError.cardNotFoundBody")
              : t("routeError.cardLoadFailedBody")}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onBackToCards}
          >
            {t("actions.backToCards")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <EditorTargetsProvider>
      <section className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3`}>
        <div
          className={`${styles.previewContainer} d-flex align-items-center justify-content-center`}
        >
          <ToolsToolbar />
          {selectedTemplateId ? (
            <CardPreviewContainer previewRef={previewRef} preferredBackId={preferredBackId} />
          ) : null}
        </div>
      </section>
      <aside className={`${styles.rightPanel} d-flex flex-column`}>
        <div className={styles.inspectorTop}>
          <TemplateChooser />
        </div>
        <div className={styles.inspectorBody}>
          <PreviewCanvasProvider previewRef={previewRef}>
            <CardInspector
              activeFrontId={activeFrontId}
              autoOpenBackId={preferredBackId}
              frontViewToken={frontViewToken}
              onRememberBackId={onRememberBackId}
              pairingReferenceId={draftSourceCardId}
            />
          </PreviewCanvasProvider>
        </div>
        <EditorActionsToolbar
          canSaveChanges={canSaveChanges}
          canDuplicate={canDuplicate}
          savingMode={savingMode}
          onExportPng={onExportPng}
          exportMenuItems={exportMenuItems}
          onSaveChanges={onSaveChanges}
          onDuplicate={onDuplicate}
          onDuplicateWithPairing={onDuplicateWithPairing}
        />
      </aside>
    </EditorTargetsProvider>
  );
}
