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
            The editor is split into three main areas: templates and actions in the header, the
            live card preview on the left, and the inspector and save controls on the right. The
            Cards and Assets buttons in the header open browsers for saved cards and image assets.
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
              Choose a template from the header (e.g. hero, monster, treasure). Each template has
              its own layout tuned to the original cards.
            </li>
            <li>
              Use the inspector on the right to edit the title, rules text, stats, and any
              template-specific options. Changes update the preview immediately.
            </li>
            <li>
              Drafts are saved automatically per template in your browser, so you can switch
              templates and return without losing in-progress work.
            </li>
            <li>
              When you&apos;re happy with a draft, use the save buttons under the inspector to save
              it as a named card in the stockpile, or update an existing saved card.
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
              Open the Assets browser from the header to upload artwork into a shared image
              library. Assets are stored in your browser and can be reused across multiple cards.
            </li>
            <li>
              In the inspector, choose an image for the current card. The tool will scale it to
              fill the artwork window; use the scale and offset controls to fine-tune the framing.
            </li>
            <li>
              Sliders and small step buttons let you nudge the image left/right/up/down and adjust
              zoom so multiple cards can share a consistent look.
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
              Rules text supports a simple markdown-style syntax for bold and italic; the editor
              takes care of wrapping text inside the available area on the card.
            </li>
            <li>
              Bold uses <code>**double asterisks**</code> and italic uses{" "}
              <code>*single asterisks*</code>.
            </li>
            <li>
              On hero and monster cards, the body text grows upward from the bottom while the stats
              strip moves up to make space, mirroring how the printed cards behave.
            </li>
            <li>
              For dotted &quot;leader lines&quot; between labels and values (e.g. prices), wrap the
              line in square brackets like <code>[cost [...] 1gp]</code>. The editor will draw the
              dots between the label and value automatically.
            </li>
            <li>
              Alignment directives let you switch alignment mid-text. Use control lines like{" "}
              <code>:::ac</code>, <code>:::al</code>, or <code>:::ar</code> on their own line to
              switch alignment until a <code>:::</code> reset line.
            </li>
            <li>
              For a single aligned block, wrap text with{" "}
              <code>:::ar your text here:::</code> (can span multiple lines).
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
              Use &quot;Save as new&quot; under the inspector to add the current draft as a named
              card. It appears in the Cards browser, grouped by template.
            </li>
            <li>
              Use &quot;Save changes&quot; when editing an existing saved card; the editor keeps
              track of which card is active and whether there are unsaved changes.
            </li>
            <li>
              Open the Cards browser from the header to browse, search, and load saved cards. When
              you load a card, its data replaces the current draft for that template in the
              inspector and preview.
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
	              Use the &quot;Export PNG&quot; button under the inspector to export the current card
	              as a 750×1050 PNG with fonts and artwork baked in. The PNG is generated directly
	              from the same SVG used for the on-screen preview.
	            </li>
	            <li>
	              In the Cards browser, use &quot;Export&quot; to bulk export multiple saved cards at
	              once. Select specific cards, or export everything in the current view (for example,
	              an entire collection), then download a single ZIP containing all images.
	            </li>
	            <li>
	              Use &quot;Export data&quot; in the footer to create a <code>.hqcc</code> backup file
	              containing your saved cards and image assets. This lives entirely in your browser
	              until you choose to save or share it.
	            </li>
	            <li>
	              Use &quot;Import data&quot; in the footer to restore from a backup. Importing replaces
	              existing cards and assets in this browser profile, so export a fresh backup first if
	              you want to keep your current work.
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
	              Open the Cards browser and use the left sidebar to switch between <b>All cards</b>,{" "}
	              <b>Unfiled</b> (not in any collection), and your own named collections.
	            </li>
	            <li>
	              Create a collection with the <b>+ New collection</b> action, then add cards to it
	              using <b>Add to collection…</b>. You can select multiple cards to organise faster.
	            </li>
	            <li>
	              When viewing a collection, use <b>Remove from collection</b> to tidy it up. Removing
	              a card from a collection does not delete the card.
	            </li>
	            <li>
	              You can rename, edit, or delete collections from the sidebar. Deleting a collection
	              keeps your cards safe; it only removes the folder.
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
	              In the Cards browser, you can export exactly what you can see: use the collection
	              sidebar, search, and the type filter to narrow the list before exporting.
	            </li>
	            <li>
	              Export works with selections: pick specific cards, or export the whole current view
	              when nothing is selected.
	            </li>
	            <li>
	              The export flow shows progress as images are generated. If you started the wrong
	              batch, you can cancel and try again.
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
	            Assets: duplicates and filename collisions
	          </h3>
	          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
	            <li>
	              When uploading images, the app will skip exact duplicates automatically (including
	              duplicates within the same upload).
	            </li>
	            <li>
	              If two different images share the same filename, the new file will be auto-renamed
	              so nothing gets overwritten and your asset list stays readable.
	            </li>
	            <li>
	              After an upload, you&apos;ll see a small review list showing what was skipped or renamed.
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
	            Settings: custom stat labels
	          </h3>
	          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
	            <li>
	              Use the Settings (cog) button in the header to customise the labels used for stats
	              like Attack/Defend/Body/Mind, plus Monster Move and Hero Starting Points.
	            </li>
	            <li>
	              Changes don&apos;t apply until you press <b>Save</b>. Use <b>Cancel</b> to close the
	              modal without changing anything.
	            </li>
	            <li>
	              Overrides are optional and off by default, so you can set values ahead of time and
	              toggle them on only when you want to use them.
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
	              Treat drafts as your scratch space per template, and use the stockpile for anything
	              you&apos;d be sad to lose or want to reuse later.
	            </li>
	            <li>
	              When experimenting with new layouts or artwork, save an extra copy to the stockpile so
	              you can always roll back.
	            </li>
	            <li>
	              If you move between machines or browsers, export a backup from one and import it into
	              the other so your cards and assets travel with you.
	            </li>
	            <li>
	              Name your assets well so they can be easily searched in the Assets browser (especially
	              once you have lots of art).
	            </li>
	            <li>
	              There are no restrictions on image size, but your browser database can grow quickly.
	              Consider optimising large images before uploading.
	            </li>
	            <li>
	              Create a few &quot;working&quot; collections (e.g. Quest 1, In Progress, To Print) so you can
	              jump between sets without relying on search every time.
	            </li>
	            <li>
	              Use Unfiled as a cleanup inbox: after importing or creating lots of cards, file them
	              into collections so it stays near-empty.
	            </li>
	            <li>
	              Before bulk exporting, filter first (collection + search + type) to make sure you&apos;re
	              downloading exactly what you need.
	            </li>
	            <li>
	              For very large exports, consider exporting in smaller batches (by collection or type)
	              so downloads are quicker and easier to file away.
	            </li>
	            <li>
	              If you customise stat labels, try to keep them consistent across cards so decks still
	              read cleanly at a glance.
	            </li>
	          </ul>
	        </section>
	      </div>
	    </ModalShell>
	  );
}
