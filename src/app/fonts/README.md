## HeroQuest Fonts

All custom typefaces that ship with the legacy `old/` build live in this folder so they can be served alongside `index.html`.

### Adding another font

1. Drop the `.ttf`, `.otf`, `.woff`, or `.woff2` files into `old/assets/fonts/`. Keep the original filenames if possible so it is easy to trace the source.
2. Declare the font in `old/assets/style.css` using `@font-face` and point the `src` to the relative path, for example:
   ```css
   @font-face {
     font-family: "HQModern";
     src: url("./fonts/HQModern.ttf") format("truetype");
     font-display: swap;
     font-weight: 400;
   }
   ```
3. Reference the newly named `font-family` wherever it should be used. The existing `--font-display`, `--font-inline`, and `--font-card-*` CSS variables in `:root` are convenient spots to plug new fonts in for headings, buttons, and card-inspired UI blocks.

### Current assignments

- `HeroQuest` / `HeroQuest Inline`: used for the app title marquee to match the classic logo treatment.
- `IM Fell English`: default `--font-inline` value that powers the primary buttons (with `Caslon Antique` as a commented backup stack).
- `Caslon Antique HQ2`: mapped to `--font-copy` and applied to modal / helper copy so longer text blocks feel like the quest and rule books.
- `Carter Sans W01`: wired into `--font-card-heading`, `--font-card-body`, and `--font-hero-name` (used by the hero list). Utility classes `.hq-card-title` / `.hq-card-text` are available for any card-style blocks.
- `Calibri Light`: used via `--font-form` for inputs, textareas, and selects so UI controls stay highly readable.

Keeping everything inside `old/assets/fonts/` ensures the build remains self‑contained; the static HTML can now load the typefaces without needing any external CDN access.
