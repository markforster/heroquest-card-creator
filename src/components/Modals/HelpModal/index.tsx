"use client";

import ModalShell from "@/components/common/ModalShell";
import { DocList, DocParagraph, DocSection, docStyles } from "@/components/common/DocContent";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";

type HelpModalProps = OpenCloseProps;

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useI18n();
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={t("heading.help")}>
      <div className={docStyles.docBody}>
        <DocSection title="Getting around">
          <DocParagraph>
            The editor is split into three main areas: actions and navigation, the live preview,
            and the inspector. The LeftNav contains quick actions (Cards, Assets, Settings/Help),
            the preview shows your card as you edit it, and the inspector on the right is where you
            change titles, rules text, stats, images, and template-specific options. Most changes
            update the preview instantly, so you can trust what you see.
          </DocParagraph>
        </DocSection>

        <DocSection title="Creating and editing cards">
          <DocList>
            <li>
              Choose a template (hero, monster, treasure, card backs) from the template picker or
              inspector. Each template matches the proportions and feel of the original cards.
            </li>
            <li>
              Use the inspector to edit the title, rules text, stats, and any template-specific
              settings.
            </li>
            <li>
              Drafts are saved automatically per template in your browser, so you can switch
              templates without losing in-progress work.
            </li>
            <li>
              When you&apos;re happy with a draft, use Save as new to create a named card in your
              stockpile, or Save changes to update an existing saved card.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Preview modes (SVG / WebGL)">
          <DocList>
            <li>
              The preview toolbar lets you switch between SVG (fast, crisp) and WebGL (3D-style)
              rendering.
            </li>
            <li>
              In WebGL, you can choose pan or rotate interaction modes to move the card under the
              light.
            </li>
            <li>
              If you want speed and clarity, use SVG. If you want the most “physical” feel, use
              WebGL.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Text, formatting, leader lines, and alignment">
          <DocList>
            <li>
              Rules text supports a simple markdown-style syntax for bold and italic. Bold uses
              <code>**double asterisks**</code> and italic uses <code>*single asterisks*</code>.
            </li>
            <li>
              Text wraps automatically inside the available area on the card.
            </li>
            <li>
              For dotted “leader lines” (e.g. cost lines), wrap a line like
              <code> [cost [...] 1gp]</code> and the dots will be drawn between the label and value.
            </li>
            <li>
              Alignment directives let you switch alignment mid-text: use <code>:::ac</code>,
              <code>:::al</code>, or <code>:::ar</code> on their own line, and <code>:::</code> to
              reset.
            </li>
            <li>
              For a single aligned block, you can wrap text like
              <code> :::ar your text here:::</code> (can span multiple lines).
            </li>
            <li>
              On hero and monster cards, the body text grows upward from the bottom while the stats
              strip moves up to make space, mirroring how printed cards behave.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Text fitting and readability">
          <DocList>
            <li>
              Use the Text Fitting button in the preview toolbar to adjust minimum font size and
              ellipsis rules.
            </li>
            <li>
              These settings affect titles and stat headings and are useful for long names or
              narrow stat labels.
            </li>
            <li>
              If text feels cramped, lower the minimum font size or enable ellipsis for cleaner
              truncation.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Working with images">
          <DocList>
            <li>
              Open Assets to upload artwork into a shared image library (stored in your browser).
            </li>
            <li>
              In the inspector, choose an image for the current card. The tool scales it to fill
              the artwork window.
            </li>
            <li>
              Use the Image Adjustments accordion to fine-tune scale, offset, and rotation; step
              buttons let you nudge left/right/up/down with precision.
            </li>
            <li>
              Once you find a good framing, it’s easy to repeat it across similar cards.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Saved cards and the stockpile">
          <DocList>
            <li>
              Use New in the left navigation to start a draft with a template.
            </li>
            <li>
              Save creates a new card from the draft. Save changes updates the active saved card.
            </li>
            <li>
              Open Cards to browse, search, and load saved cards.
            </li>
            <li>
              Use collections to organise cards without deleting them.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Collections (organising saved cards)">
          <DocList>
            <li>
              In the Cards browser, the left sidebar lets you switch between All cards, Unfiled,
              and named collections.
            </li>
            <li>
              Create a collection with + New collection, then add cards using Add to collection…
              (multi-select supported).
            </li>
            <li>
              Removing a card from a collection does not delete it.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Card faces and pairing">
          <DocList>
            <li>
              Some templates support front/back faces. Use the face picker to switch between sides
              while editing.
            </li>
            <li>
              Pairing keeps the two faces together for browsing and export workflows.
            </li>
            <li>
              Fronts can be paired to a back via the Combine button; backs can manage many fronts
              at once using Manage Pairings.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Title visibility and borders">
          <DocList>
            <li>
              Labelled backs can optionally hide/show the title.
            </li>
            <li>
              Some templates allow custom border colours, smart swatch suggestions, and saved
              swatches for quick reuse.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Exporting cards and backups">
          <DocList>
            <li>
              Export the current card to a 750×1050 PNG from the inspector. The PNG is generated
              from the same SVG used in the preview.
            </li>
            <li>
              If a card has paired faces, the export menu can include options to export both faces
              or an active front with a back.
            </li>
            <li>
              In the Cards browser, use Export to bulk export multiple cards as a ZIP.
            </li>
            <li>
              When exporting a collection or selection, you may be prompted to include paired
              faces.
            </li>
            <li>
              Use Export data and Import data in the header to back up or restore your entire
              library (.hqcc file). Import replaces existing data in this browser profile, so
              export first if you want a safety copy.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Bulk export (downloading lots of cards)">
          <DocList>
            <li>
              Export exactly what you can see: a full collection, a filtered view, or a
              multi-selection.
            </li>
            <li>
              Bulk export creates a single ZIP with all selected card images.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Tips">
          <DocList>
            <li>
              If a preview feels slow, switch to SVG and re-enable WebGL only when you need it.
            </li>
            <li>
              Use text fitting controls to keep long titles and stat headings readable without
              shrinking everything.
            </li>
            <li>
              Keep an occasional .hqcc backup if you do a lot of card work in one browser profile.
            </li>
          </DocList>
        </DocSection>
      </div>
    </ModalShell>
  );
}
