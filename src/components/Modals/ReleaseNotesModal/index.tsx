"use client";

import styles from "@/app/page.module.css";
import InAppDocumentLayout from "@/components/common/InAppDocumentLayout";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";
import { APP_VERSION } from "@/version";

import ReleaseNotesContent, { releaseNotesSections } from "./ReleaseNotesContent";

type ReleaseNotesModalProps = OpenCloseProps;

export default function ReleaseNotesModal({ isOpen, onClose }: ReleaseNotesModalProps) {
  const { t } = useI18n();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("heading.aboutTool")} - v${APP_VERSION}`}
      contentClassName={styles.helpPopover}
    >
      <div className={styles.helpBundledContent}>
        <InAppDocumentLayout
          articleIntroduction="Learn what the app is, why it exists, what it can do, and how it has developed over time."
          articleTitle="About the card creator"
          compactNavigation
          heroIntroduction={`Version ${APP_VERSION}. Project background, credits, and release history.`}
          heroTitle="About"
          navigationLabel="About and release notes contents"
          sections={releaseNotesSections}
        >
          <ReleaseNotesContent />
        </InAppDocumentLayout>
      </div>
    </ModalShell>
  );
}
