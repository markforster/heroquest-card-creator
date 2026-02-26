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
          <DocParagraph>
            Cards and Assets open in the main area, and your editor preview is still there when you
            return.
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
              Start a new card in draft mode or open an existing card, make changes, and save when
              you&apos;re ready.
            </li>
            <li>
              Title toolbar controls are template-dependent. Labelled backs can switch ribbon/plain
              styles and top/bottom placement.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Preview modes">
          <DocList>
            <li>
              The preview toolbar lets you switch between the flat view and a 3D view.
            </li>
            <li>
              Use the flat view when you want to see the card exactly as it will print.
            </li>
            <li>
              Use the 3D view to see how the card would look if you held it in your hand and could
              turn or flip it.
            </li>
            <li>
              In 3D spin mode, double-click recenters the card; if it&apos;s already front-facing,
              double-click flips it.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Text, formatting, leader lines, and alignment">
          <DocList>
            <li>
              Rules text supports a simple markdown-style syntax for bold and italic. Bold uses
              <code>**double asterisks**</code>, italic uses <code>*single asterisks*</code>, and
              bold+italic uses <code>***triple asterisks***</code>.
            </li>
            <li>
              Text wraps automatically inside the available area on the card.
            </li>
            <li>
              For dotted “leader lines” (e.g. cost lines), wrap a line like
              <code> [cost [...] 1gp]</code> and the dots will be drawn between the label and value.
            </li>
            <li>
              To group leader lines and control layout, wrap them in
              <code> [[</code> and <code>]]</code>. You can add an optional settings line like
              <code> [{'{'}pivot:50%, wrap:value{'}'}]</code> to set a fixed pivot or wrap values
              inside the value column.
            </li>
            <li>
              Inline dice tokens are supported in body text (combat faces, D6 pips, and CD/AD/DD/MD),
              including color and face overrides.
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
              In the inspector, choose an image for the current card. The tool scales it to fit
              within the artwork window by default.
            </li>
            <li>
              Use the Image Adjustments popover (adjustments icon) to fine-tune scale, offset, and
              rotation; step buttons let you nudge left/right/up/down with precision.
            </li>
            <li>
              Scale starts at fit-to-frame (1.0), and you can scale from 0.5–2.0.
            </li>
            <li>
              Once you find a good framing, it’s easy to repeat it across similar cards.
            </li>
            <li>
              Image and Icon fields support autocomplete search; the current asset stays pinned in
              the results.
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
            <li>
              Delete moves cards into Recently Deleted; restore is available there, and permanent
              delete is only available in Recently Deleted.
            </li>
            <li>
              In manage mode, you can toggle grid/table view; table headers stay visible while
              scrolling.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Collections (organising saved cards)">
          <DocList>
            <li>
              In the Cards browser, the right Collections panel lets you switch between All cards,
              Unfiled, and named collections. On narrow screens, this panel appears as a drawer.
            </li>
            <li>
              Create a collection with + New collection, then add cards using Add to collection…
              (multi-select supported).
            </li>
            <li>
              Removing a card from a collection does not delete it.
            </li>
            <li>
              Delete is safe: cards move to Recently Deleted so you can restore them if needed.
            </li>
            <li>
              Enable the optional Collections tree view to group folders, collapse/expand, and use
              Collapse all / Expand all controls.
            </li>
            <li>
              Drag cards onto collection leaves to add them (multi-select supported).
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
              The inspector has Properties and Pairing views. Fronts can be paired to multiple
              backs, and backs can manage multiple fronts in one place.
            </li>
            <li>
              The pairing modal supports multi-select, and actions that remove multiple pairings
              show a confirmation prompt.
            </li>
          </DocList>
        </DocSection>

        <DocSection title="Title visibility and borders">
          <DocList>
            <li>
              Labelled backs can optionally hide/show the title.
            </li>
            <li>
              Labelled backs can switch ribbon/plain title styles, adjust placement, and set a
              custom title color with reset.
            </li>
            <li>
              Some templates allow custom border colours, smart swatch suggestions, and saved
              swatches for quick reuse.
            </li>
            <li>
              Small/Large Artwork templates support textured border color controls.
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
              If missing artwork is detected, you’ll be prompted before export. In bulk export,
              missing cards are skipped and included in a report.
            </li>
            <li>
              Missing artwork warnings can appear in preview, and a startup banner may appear if
              your library has missing assets.
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
            <li>
              Finalizing shows progress; if progress isn’t available, you’ll see a “Finalizing…”
              status.
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
            <li>
              Recently Deleted is a safety net—restore if you remove something by mistake.
            </li>
            <li>
              If you see missing-artwork warnings, fix them before export to avoid skipped cards.
            </li>
          </DocList>
        </DocSection>
      </div>
    </ModalShell>
  );
}
