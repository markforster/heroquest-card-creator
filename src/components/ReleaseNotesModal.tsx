"use client";

import ModalShell from "@/components/ModalShell";

type ReleaseNotesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ReleaseNotesModal({ isOpen, onClose }: ReleaseNotesModalProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="About this tool">
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
            What this is
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            HeroQuest Card Creator is a small passion project for building custom HeroQuest-style
            cards in your browser. It runs completely on the client, works from static files, and
            is designed to feel like sitting down with the original cards and a very friendly
            layout tool.
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
            Why it exists
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            The project was inspired by the excellent Unity-based{" "}
            <a
              href="https://actionfence.itch.io/hqcc"
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "#e6b35a" }}
            >
              HeroQuest Card Creator
            </a>
            , which made it possible for me to create my first homebrew cards. That tool did a lot
            of heavy lifting, but my own workflow needed something web-based, fast to load, and
            easier to run anywhere. This app is a homage to that original work: it aims to stay
            faithful to the same card layouts and options, while smoothing out the UX so making a
            new card feels quick and enjoyable.
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
            What you can do today
          </h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.4 }}>
            <li>
              Build cards from templates that closely match the original game: heroes, monsters,
              treasure cards (small and large), and different card backs. Each template is tuned to
              the proportions and typography of the classic cards.
            </li>
            <li>
              Upload artwork into a shared asset library and reuse it across multiple cards. When
              you pick an image, the tool automatically scales it to fill the card window, and you
              can fine-tune the framing.
            </li>
            <li>
              Position card art with pixel-like precision using sliders and small step buttons that
              nudge left, right, up or down. Scaling feels consistent regardless of the underlying
              image size, so once you&apos;re happy with a look it&apos;s easy to repeat it on
              other cards.
            </li>
            <li>
              Add rules text using a simple markdown-style syntax for bold and italic, with
              automatic word wrapping inside the available text area. There&apos;s also a
              lightweight &quot;leader line&quot; format for things like{" "}
              <code>[cost [...] 1gp]</code> that draws dotted lines between labels and values.
            </li>
            <li>
              On hero and monster cards, the body text grows upward from the bottom of the card
              while the stats strip moves up to make space, mirroring how the printed cards
              actually look.
            </li>
            <li>
              Edit stats with compact plus/minus controls instead of dropdowns. The layout mirrors
              the stats strip on the card so what you type on the right closely matches what you
              see on the left.
            </li>
            <li>
              Save your work automatically in the browser. Each template keeps its own draft, and
              you can also save named cards into a stockpile and reload them later from the Cards
              browser, all without creating an account or touching a server.
            </li>
            <li>
              Export the current card to a 750×1050 PNG with fonts and artwork baked in, ready to
              drop into a print layout or share online. The exported image is generated from the
              same SVG used for the on-screen preview.
            </li>
            <li>
              Back up your entire library of cards and image assets to a single <code>.hqcc</code>{" "}
              file and restore it in the same or another browser, so you can move work between
              machines or keep a local safety copy.
            </li>
            <li>
              Browse example cards and screenshots to see what&apos;s possible. A growing gallery
              of cards I&apos;ve built with this tool lives at{" "}
              <a
                href="https://public.markforster.info/Heroquest/cards/"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "#e6b35a" }}
              >
                /Heroquest/cards
              </a>{" "}
              and sample screenshots of the editor in action are at{" "}
              <a
                href="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/"
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "#e6b35a" }}
              >
                /Heroquest/Tools/card-maker-sample-screenshots
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Notes & future work
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            This version is intentionally &quot;early but useful&quot;: it should feel about 99%
            usable for day-to-day card creation, but there will definitely be rough edges, glitches
            and missing quality-of-life touches. Things like keyboard shortcuts, richer help,
            smoother loading, and additional card templates and layout polish are all on the list.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            At the moment the tool has been primarily developed and tested in Chrome on desktop. It
            should also work in Safari and Firefox, though some visual glitches or layout quirks
            are likely. Mobile phones are not supported yet, and iPad currently has known CSS
            issues that will be addressed in a future pass on responsive layouts.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            The plan is to keep iterating, publish the code on GitHub, and provide a self-contained
            build that can be hosted anywhere. In the meantime, if this tool helps you create new
            quests, heroes or treasure for your table, it&apos;s doing its job.
          </p>
        </section>

        <section style={{ marginTop: "0.9rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Update 18/12/2025
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            This pass has been all about polish and consistency rather than big new features. The
            overall look should now feel tidier, more readable, and a bit closer to a finished app
            while still keeping the same core layout and card templates.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            Buttons and forms have been standardised on a single visual style, so actions in the
            header, inspector, and modals now feel like part of the same family. Primary actions
            (like loading cards, saving changes, or uploading assets) are easier to spot, while
            supporting actions use a lighter, outlined treatment. The save, save-as-new, and export
            buttons have been grouped and reordered so their intent and priority are clearer at a
            glance.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            The Assets and Cards browsers have also had a clean-up: toolbars are aligned, search
            and filter controls are clearer, destructive actions are more obviously marked, and
            selection behaves more predictably. Image-related controls in the inspector now read
            more like a proper form, with labels, grouped controls, tooltips, and better spacing,
            so nudging and scaling artwork should feel less fussy.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            Under the surface, a few rough edges have been smoothed out as well: modals can be
            closed with the Escape key, the save buttons behave more reliably across refreshes, and
            some stray visual glitches around the preview and inputs have been ironed out. There is
            still plenty of room for future quality-of-life improvements, but this update should
            make everyday use noticeably calmer and more consistent.
          </p>
        </section>

        <section style={{ marginTop: "0.9rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Update 18/12/2025 – Backup &amp; restore
          </h3>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            You can now back up and restore your work using the new &quot;Export data&quot; and
            &quot;Import data&quot; links in the footer. Export creates a single <code>.hqcc</code>{" "}
            file (a zipped JSON backup) that contains your saved cards, image assets, and key
            editor state; import lets you load that file in the same or another browser and
            continue where you left off.
          </p>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            Backups are created entirely in your browser and never leave your device unless you
            choose to move or share them. Importing a backup will replace the existing cards and
            assets in this browser profile, so if you&apos;ve already started new work here it&apos;s
            worth exporting a fresh backup first. The format is designed to be forwards-compatible,
            so future versions of the tool can continue to read today&apos;s backups, and older
            <code>.hqcc.json</code> backups from earlier versions will still import correctly.
          </p>
        </section>

        <section style={{ marginTop: "0.9rem" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: "0.35rem",
              fontSize: "1.2rem",
              color: "#e6b35a",
            }}
          >
            Screenshots
          </h3>
          <p style={{ margin: 0, marginBottom: "0.5rem", lineHeight: 1.4 }}>
            A few examples of the editor in use. You can open any image in a new tab to see it at
            full resolution.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "0.5rem",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/Assets%20Manager.png"
              alt="Assets manager screenshot"
              style={{
                width: "100%",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.6)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/Hero%20Card%20Creation.png"
              alt="Hero card creation screenshot"
              style={{
                width: "100%",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.6)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/Monster%20Card%20Creation.png"
              alt="Monster card creation screenshot"
              style={{
                width: "100%",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.6)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/Small%20Artwork%20Card%20Creation.png"
              alt="Small artwork treasure card creation screenshot"
              style={{
                width: "100%",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.6)",
              }}
            />
          </div>
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.4 }}>
            For the full set of screenshots, visit{" "}
            <a
              href="https://public.markforster.info/Heroquest/Tools/card-maker-sample-screenshots/"
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "#e6b35a" }}
            >
              /Heroquest/Tools/card-maker-sample-screenshots
            </a>
            .
          </p>
        </section>
      </div>
    </ModalShell>
  );
}

