"use client";

import styles from "@/app/page.module.css";
import { appIconSrc, helpCardShowcaseCssBackground } from "@/assets/app-shell-assets";
import { docStyles } from "@/components/common/DocContent";

import type { CSSProperties, ReactNode } from "react";

export type InAppDocumentSection = readonly [id: string, label: string];

type InAppDocumentLayoutProps = {
  articleIntroduction: ReactNode;
  articleTitle: ReactNode;
  children: ReactNode;
  compactNavigation?: boolean;
  heroIntroduction: ReactNode;
  heroTitle: ReactNode;
  navigationLabel: string;
  sections: readonly InAppDocumentSection[];
};

const BUNDLED_HELP_HERO_STYLE = {
  "--bundled-help-background-image": helpCardShowcaseCssBackground,
} as CSSProperties;

export default function InAppDocumentLayout({
  articleIntroduction,
  articleTitle,
  children,
  compactNavigation = false,
  heroIntroduction,
  heroTitle,
  navigationLabel,
  sections,
}: InAppDocumentLayoutProps) {
  return (
    <div className={styles.bundledHelpPage}>
      <header className={styles.bundledHelpHero} style={BUNDLED_HELP_HERO_STYLE}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.bundledHelpAppIcon}
          src={appIconSrc}
          width="180"
          height="180"
          alt=""
        />
        <p className={styles.bundledHelpEyebrow}>HeroQuest Card Creator</p>
        <h2 className={styles.bundledHelpTitle}>{heroTitle}</h2>
        <p className={styles.bundledHelpIntro}>{heroIntroduction}</p>
      </header>

      <div className={styles.bundledHelpLayout}>
        <nav
          className={`${styles.bundledHelpContents}${
            compactNavigation ? ` ${styles.bundledHelpContentsCompact}` : ""
          }`}
          aria-label={navigationLabel}
        >
          <h2>On this page</h2>
          <ol>
            {sections.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById(id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <article className={`${styles.bundledHelpArticle} ${docStyles.docBody}`}>
          <header className={styles.bundledHelpArticleHeader}>
            <h2>{articleTitle}</h2>
            <p>{articleIntroduction}</p>
          </header>
          {children}
        </article>
      </div>
    </div>
  );
}
