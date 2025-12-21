"use client";

import ModalShell from "@/components/ModalShell";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Help">
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
          </ul>
        </section>
      </div>
    </ModalShell>
  );
}
