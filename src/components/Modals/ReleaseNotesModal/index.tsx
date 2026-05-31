"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DocList, DocParagraph, DocSection, docStyles } from "@/components/common/DocContent";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";
import { APP_VERSION } from "@/version";

type ReleaseNotesModalProps = OpenCloseProps;

export default function ReleaseNotesModal({ isOpen, onClose }: ReleaseNotesModalProps) {
  const { t } = useI18n();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("about-what-this-is");
  const tocSections = useMemo(
    () => [
      { id: "about-what-this-is", title: "What this is" },
      { id: "about-why-it-exists", title: "Why it exists" },
      { id: "about-what-you-can-do-today", title: "What you can do today" },
      { id: "about-notes-future-work", title: "Notes & future work" },
      { id: "about-update-v0-6-0", title: "Update 31/05/2026 (v0.6.0)" },
      { id: "about-update-v0-5-7", title: "Update 30/03/2026 (v0.5.7)" },
      { id: "about-update-v0-5-6", title: "Update 15/03/2026 (v0.5.6)" },
      { id: "about-update-v0-5-5", title: "Update 07/03/2026 (v0.5.5)" },
      { id: "about-update-v0-5-4", title: "Update 28/02/2026 (v0.5.4)" },
      { id: "about-update-v0-5-3-1", title: "Update 28/02/2026 (v0.5.3.1)" },
      { id: "about-update-v0-5-3", title: "Update 26/02/2026 (v0.5.3)" },
      { id: "about-update-v0-5-2", title: "Update 12/02/2026 (v0.5.2)" },
      { id: "about-update-v0-5-1", title: "Update 07/02/2026 (v0.5.1)" },
      { id: "about-update-v0-5-0", title: "Update 10/01/2026 (v0.5.0)" },
      { id: "about-update-v0-4-0", title: "Update 18/12/2025 (v0.4.0)" },
    ],
    [],
  );

  const jumpToSection = useCallback((sectionId: string) => {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;
    sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(sectionId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof IntersectionObserver === "undefined") return;
    const root = contentRef.current;
    if (!root) return;
    const sectionElements = tocSections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sectionElements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const candidates = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (candidates.length === 0) return;
        const nextId = (candidates[0].target as HTMLElement).id;
        if (nextId) setActiveSectionId(nextId);
      },
      {
        root,
        threshold: [0.15, 0.35, 0.6, 0.85],
      },
    );
    sectionElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [isOpen, tocSections]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("heading.aboutTool")} - v${APP_VERSION}`}
    >
      <div className={docStyles.aboutLayout}>
        <div className={docStyles.aboutContent}>
          <div className={docStyles.aboutMobileToc}>
            <label htmlFor="about-toc-select" className={docStyles.aboutMobileTocLabel}>
              On this page
            </label>
            <select
              id="about-toc-select"
              className={docStyles.aboutMobileTocSelect}
              value={activeSectionId}
              onChange={(event) => jumpToSection(event.target.value)}
            >
              {tocSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
          <div ref={contentRef} className={docStyles.docBody}>
        <DocSection id="about-what-this-is" title="What this is">
          <DocParagraph>
            HeroQuest Card Creator is a small passion project for building custom HeroQuest-style
            cards in your browser. It runs completely on the client, works from static files, and is
            designed to feel like sitting down with the original cards and a very friendly layout
            tool.
          </DocParagraph>
        </DocSection>

        <DocSection id="about-why-it-exists" title="Why it exists">
          <DocParagraph>
            The project was inspired by the excellent Unity-based{" "}
            <a
              href="https://actionfence.itch.io/hqcc"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              HeroQuest Card Creator
            </a>
            , which made it possible for me to create my first homebrew cards. That tool did a lot
            of heavy lifting, but my own workflow needed something web-based, fast to load, and
            easier to run anywhere. This app is a homage to that original work: it aims to stay
            faithful to the same card layouts and options, while smoothing out the UX so making a
            new card feels quick and enjoyable.
          </DocParagraph>
        </DocSection>

        <DocSection id="about-what-you-can-do-today" title="What you can do today">
          <DocList>
            <li>
              Build cards from templates that closely match the original game: heroes, monsters,
              treasure cards (small and large), and different card backs. Each template is tuned to
              the proportions and typography of the classic cards.
            </li>
            <li>
              Upload artwork into a shared asset library and reuse it across multiple cards. When
              you pick an image, the tool automatically scales it to fit within the card window,
              and you can fine-tune the framing.
            </li>
            <li>
              Position card art with pixel-like precision using sliders and small step buttons that
              nudge left, right, up or down. Scaling feels consistent regardless of the underlying
              image size, so once you&apos;re happy with a look it&apos;s easy to repeat it on other
              cards.
            </li>
            <li>
              Add rules text using a simple markdown-style syntax for bold and italic, with
              automatic word wrapping inside the available text area. There&apos;s also a
              lightweight &quot;leader line&quot; format for things like <code>[cost [...] 1gp]</code> that
              draws dotted lines between labels and values.
            </li>
            <li>
              On hero and monster cards, the body text grows upward from the bottom of the card
              while the stats strip moves up to make space, mirroring how the printed cards actually
              look.
            </li>
            <li>
              Edit stats with compact plus/minus controls instead of dropdowns. The layout mirrors
              the stats strip on the card so what you type on the right closely matches what you see
              on the left.
            </li>
            <li>
              Save your work automatically in the browser. Each template keeps its own draft, and
              you can also save named cards into a stockpile and reload them later from the Cards
              browser, all without creating an account or touching a server.
            </li>
            <li>
              Build structured Decks in a dedicated workspace, using grouped sets and front-face
              entries so larger projects can be organised as complete playable systems rather than
              loose card lists.
            </li>
            <li>
              Organize decks with drag-and-drop workflows: reorder groups, move sets between
              sections, reorder entries, and drag cards directly into sets.
            </li>
            <li>
              Assign quantities to cards inside sets so decks can represent repeated encounters,
              weighted treasure pools, rarity systems, and other gameplay-oriented distributions.
            </li>
            <li>
              Use deck-aware inspector context to see where cards are used across decks, making
              larger libraries easier to understand and maintain.
            </li>
            <li>
              Use safer remove and recovery-oriented workflows while deck-building: removing an
              entry from a set does not delete the underlying card, and paired-card recovery
              workflows reduce accidental structural breakage during reorganization.
            </li>
            <li>
              Export the current card to a 756×1056 PNG with fonts and artwork baked in, ready to
              drop into a print layout or share online. The exported image is generated from the
              same SVG used for the on-screen preview.
            </li>
            <li>
              Export decks directly from Decks workflows. Current deck export focuses on structured
              organization/export preparation and lays important groundwork for future print/PDF
              workflows planned for later releases.
            </li>
            <li>
              Back up your entire library of cards and image assets to a single <code>.hqcc</code>{" "}
              file and restore it in the same or another browser, so you can move work between
              machines or keep a local safety copy.
            </li>
            <li>
              Organize your library with collections in the Cards browser, and bulk export a
              selection or an entire view as a ZIP.
            </li>
            <li>
              Customize stat labels globally (optional), and apply custom border colours to labelled
              backs with smart suggestions, saved swatches, and quick restore.
            </li>
            <li>
              Use text fitting controls to keep long titles and stat headings readable, and switch
              to the WebGL preview for a more physical, card-in-hand feel.
            </li>
            <li>
              Pair front and back faces so related cards stay linked, with quick previews and bulk
              pairing tools.
            </li>
            <li>
              Export paired faces together from the inspector or include paired faces during bulk
              export.
            </li>
            <li>Use Image Adjustments to refine scale, position, and rotation for artwork.</li>
            <li>
              Browse example cards and screenshots to see what&apos;s possible. A growing gallery of
              cards I&apos;ve built with this tool lives at{" "}
              <a
                href="https://public.markforster.info/Heroquest/cards/"
                target="_blank"
                rel="noreferrer noopener"
                className={docStyles.docLink}
              >
                /Heroquest/cards
              </a>{" "}
              and sample screenshots of the editor in action are at{" "}
              <a
                href="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/"
                target="_blank"
                rel="noreferrer noopener"
                className={docStyles.docLink}
              >
                /Heroquest/Tools/card-maker-sample-screenshots
              </a>
              .
            </li>
          </DocList>
        </DocSection>

        <DocSection id="about-notes-future-work" title="Notes & future work">
          <DocParagraph>
            This version is intentionally “early but useful”: it should feel about 99% usable for
            day-to-day card creation, while still leaving room for rough edges and future
            improvements. Recent releases (especially 0.5.3) have focused heavily on polish and
            quality-of-life work, and that momentum will continue.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            The tool is confirmed working in Chrome, Safari, Edge, and Firefox on desktop. Mobile
            phones and tablets are still not supported, though they may be explored in future
            passes—no promises yet.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            The plan is to keep iterating, publish the code on GitHub, and provide a self-contained
            build that can be hosted anywhere. In the meantime, if this tool helps you create new
            quests, heroes, or treasure for your table, it&apos;s doing its job.
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-6-0"
          title="Update 31/05/2026 (v0.6.0)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This release introduces Decks, one of the largest additions to the project so far.
            Earlier releases laid groundwork across pairing, collections, export preparation, and
            safer workflows; v0.6.0 brings those foundations together into a structured deck-building
            experience for larger HeroQuest projects.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Decks can now be organized as grouped sets with front-face entries, helping creators
            build and manage complete playable systems such as treasure ecosystems, encounter groups,
            spell schools, hero packs, and expansion content.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>Dedicated Decks workspace with grid and focused detail editing workflows.</li>
            <li>Drag-and-drop deck building for groups, sets, and entries.</li>
            <li>Quantity support for cards inside sets.</li>
            <li>Deck-aware inspector membership visibility and usage context.</li>
            <li>Safer remove, recovery, and cleanup-oriented workflows.</li>
            <li>Deck export integrated into app workflows.</li>
            <li>Localization and terminology refinement across Decks UI.</li>
            <li>Broad stability and interaction polish across larger editing workflows.</li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.6.0"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.6.0
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-7"
          title="Update 30/03/2026 (v0.5.7)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This update focused on first-run clarity and polish, especially when your library is
            empty. Assets and Stockpile now provide clearer onboarding guidance so new users can get
            started faster without guessing the next step.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              New empty-library onboarding in Assets and Stockpile with quick-start guidance and
              direct setup/import actions.
            </li>
            <li>Resources access improved in Assets for faster access to supporting links.</li>
            <li>
              Color picker input is more reliable with manual hex entry, better validation, and
              cleaner keyboard behavior.
            </li>
            <li>Small app-shell updates, including header navigation refinements.</li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.7"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.7
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-6"
          title="Update 15/03/2026 (v0.5.6)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This release expanded visual control and storage efficiency, with improvements that make
            day-to-day editing feel more flexible while keeping larger libraries lighter and easier
            to manage.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              Added global background tint and body text color controls across templates for more
              styling flexibility.
            </li>
            <li>Treasure artwork window behavior was reworked for cleaner, more consistent output.</li>
            <li>Added an in-app PNG to JPEG conversion workflow for compatible assets.</li>
            <li>
              Introduced a compact backup format and major thumbnail/storage optimizations to reduce
              library size.
            </li>
            <li>Added system/library information improvements and contextual stockpile hints.</li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.6"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.6
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-5"
          title="Update 07/03/2026 (v0.5.5)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This update focused on print-readiness and presentation quality, while also broadening
            language and appearance support across the app.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>Added full Light, Dark, and System theme support.</li>
            <li>
              Export workflows were significantly expanded with bleed, crop/cut marks, and clearer
              export options.
            </li>
            <li>
              Exported images gained subtle watermarking and metadata tagging (export-only, not in
              editor preview).
            </li>
            <li>
              Card canvas and print-related sizing were refined to improve consistency between screen
              output and physical cards.
            </li>
            <li>
              Added broader i18n coverage and language menu refinements for easier language
              selection.
            </li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.5"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.5
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-4"
          title="Update 28/02/2026 (v0.5.4)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This was a focused bug-fix release improving image zoom behavior and rendering
            consistency, especially on artwork-heavy templates.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              Image scaling/zoom controls were corrected so 1x, 2x, and 3x behave as expected.
            </li>
            <li>Zoom slider feedback and marker alignment were made clearer and more predictable.</li>
            <li>
              Fixed edge-rendering artifacts seen on some treasure card templates at higher zoom
              levels.
            </li>
            <li>
              Kept full-card coverage workflows available while making zoom behavior easier to
              understand.
            </li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.4"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.4
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-3-1"
          title="Update 28/02/2026 (v0.5.3.1)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This was a small maintenance patch in the 0.5.3 cycle, focused on incremental
            stabilization before the broader 0.5.4 update.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.3.1"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.3.1
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-3"
          title="Update 26/02/2026 (v0.5.3)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This release is a major step forward in how the library feels to use, with a clearer
            Stockpile layout, safer card management, and smoother collection workflows so it’s
            easier to find, organise, and act on your cards without friction.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Assets and pairing work are now more deliberate and visible: the Assets panel offers
            richer inspection and safer replacement, images are easier to find and filter, and
            pairing is split into a dedicated view with multi-select support and clearer safety
            prompts when removing multiple links.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Exports are more reliable and transparent, and the editor gets a polish pass with
            better formatting helpers, inline dice support, and more control over labelled-back
            title styles and textured borders.
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              Stockpile panels, table view, and Recently Deleted improve browsing, selection, and
              safe recovery.
            </li>
            <li>
              Collections tree view and drag-and-drop make organising large libraries faster.
            </li>
            <li>
              Missing-artwork checks warn before export and keep issues visible while you work.
            </li>
            <li>
              Inline dice tokens, leader groups, and the new formatting cheat sheet make rules text
              more expressive.
            </li>
            <li>
              Labelled-back title styles/colors and textured border controls add extra finishing
              polish.
            </li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.3"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.3
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-2"
          title="Update 12/02/2026 (v0.5.2)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>This release expanded pairing workflows and export options:</DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              Front/back faces are now first-class, with clearer pairing controls in the inspector
              and stockpile.
            </li>
            <li>
              Back faces can manage multiple paired fronts with visual stacks and quick previews.
            </li>
            <li>Export supports paired faces with a split-button and a bulk export prompt.</li>
            <li>
              Template selection is faster with keyboard navigation and a Cmd/Ctrl+Shift+Y shortcut.
            </li>
            <li>
              WebGL preview now shows a blueprint fallback on first render for smoother loading.
            </li>
            <li>Image adjustments add rotation controls alongside position and scale.</li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.2"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.2
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-1"
          title="Update 07/02/2026 (v0.5.1)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>This update focused on the editor’s foundation and workflow:</DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              A blueprint-based renderer now drives card layouts for better consistency and easier
              future expansion.
            </li>
            <li>A metadata-driven inspector makes editing forms more flexible and maintainable.</li>
            <li>A three-pane layout adds LeftNav navigation and clearer editor flow.</li>
            <li>Custom border colours for labelled backs, with saved swatches and easy restore.</li>
            <li>Double stats plus inline stat input for richer stat layouts and faster editing.</li>
            <li>
              Safer storage and export improvements (DB version guard, export compression,
              persistent storage request).
            </li>
            <li>Optional Tauri desktop wrapper for native packaging.</li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.1"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.1
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-5-0"
          title="Update 10/01/2026 (v0.5.0)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This release focused on organizing larger libraries and making exports easier:
          </DocParagraph>
          <DocList className={docStyles.docListSpaced}>
            <li>
              Collections were added to the Cards browser, with a sidebar for All cards, Unfiled,
              and named collections.
            </li>
            <li>Bulk export to ZIP lets you export a selection or a full view in one download.</li>
            <li>
              Duplicate image detection keeps the asset library tidy (skips duplicates and
              auto-renames same-name uploads).
            </li>
            <li>
              Custom stat labels (optional) let you rename stats globally, and those preferences are
              included in backups.
            </li>
          </DocList>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Full release notes:{" "}
            <a
              href="https://github.com/markforster/heroquest-card-creator/releases/tag/v0.5.0"
              target="_blank"
              rel="noreferrer noopener"
              className={docStyles.docLink}
            >
              v0.5.0
            </a>
          </DocParagraph>
        </DocSection>

        <DocSection
          id="about-update-v0-4-0"
          title="Update 18/12/2025 (v0.4.0)"
          className={docStyles.docSectionSpaced}
        >
          <DocParagraph>
            This pass has been all about polish and consistency rather than big new features. The
            overall look should now feel tidier, more readable, and a bit closer to a finished app
            while still keeping the same core layout and card templates.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Buttons and forms have been standardised on a single visual style, so actions in the
            header, inspector, and modals now feel like part of the same family. Primary actions
            (like loading cards, saving changes, or uploading assets) are easier to spot, while
            supporting actions use a lighter, outlined treatment. The save, save-as-new, and export
            buttons have been grouped and reordered so their intent and priority are clearer at a
            glance.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            The Assets and Cards browsers have also had a clean-up: toolbars are aligned, search and
            filter controls are clearer, destructive actions are more obviously marked, and
            selection behaves more predictably. Image-related controls in the inspector now read
            more like a proper form, with labels, grouped controls, tooltips, and better spacing, so
            nudging and scaling artwork should feel less fussy.
          </DocParagraph>
          <DocParagraph className={docStyles.docParagraphSpaced}>
            Under the surface, a few rough edges have been smoothed out as well: modals can be
            closed with the Escape key, the save buttons behave more reliably across refreshes, and
            some stray visual glitches around the preview and inputs have been ironed out. There is
            still plenty of room for future quality-of-life improvements, but this update should
            make everyday use noticeably calmer and more consistent.
          </DocParagraph>
        </DocSection>
          </div>
        </div>
        <nav className={docStyles.aboutToc} aria-label="About sections">
          <h3 className={docStyles.aboutTocHeading}>On this page</h3>
          <ul className={docStyles.aboutTocList}>
            {tocSections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={`${docStyles.aboutTocButton} ${
                    activeSectionId === section.id ? docStyles.aboutTocButtonActive : ""
                  }`}
                  onClick={() => jumpToSection(section.id)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </ModalShell>
  );
}
