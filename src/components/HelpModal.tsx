"use client";

import ModalShell from "@/components/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useI18n();
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={t("heading.help")}> 
      <div style={{ maxHeight: "60vh", overflowY: "auto", fontSize: "1.1rem" }}>
        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Getting around
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            The editor is split into three main areas: actions and navigation, the live preview,
            and the inspector. The LeftNav contains quick actions (Cards, Assets, Settings/Help),
            the preview shows your card as you edit it, and the inspector on the right is where you
            change titles, rules text, stats, images, and template-specific options. Most changes
            update the preview instantly, so you can trust what you see.
          </p>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Creating and editing cards
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Preview modes (SVG / WebGL)
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Text, formatting, leader lines, and alignment
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Text fitting and readability
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Working with images
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Saved cards and the stockpile
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
            <li>
              Use Save as new under the inspector to add the current draft as a named card.
            </li>
            <li>
              Use Save changes to update the active saved card.
            </li>
            <li>
              Open Cards to browse, search, and load saved cards. Loading a card replaces the
              current draft for that template.
            </li>
            <li>
              Use collections to organise cards without deleting them.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Collections (organising saved cards)
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Card faces and pairing
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Title visibility and borders
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
            <li>
              Labelled backs can optionally hide/show the title.
            </li>
            <li>
              Some templates allow custom border colours, smart swatch suggestions, and saved
              swatches for quick reuse.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Exporting cards and backups
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Bulk export (downloading lots of cards)
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
            <li>
              Export exactly what you can see: a full collection, a filtered view, or a
              multi-selection.
            </li>
            <li>
              Bulk export creates a single ZIP with all selected card images.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Tips
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
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
          </ul>
        </section>
      </div>
    </ModalShell>
  );
}
