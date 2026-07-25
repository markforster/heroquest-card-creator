---
title: Understand Template-Specific Card Controls
type: guide
status: first-draft
source_questions: [Q-0253, Q-0254, Q-0277, Q-0280]
verified: 2026-07-22
app_version: 0.8.0
---
# Understand Template-Specific Card Controls

The Properties panel changes with the card template. This keeps each card focused on the content that its layout can display, so a missing field usually means that the current template does not support it.

## Which controls does each template provide?

<!-- help-visual:p019:start -->
<figure class="hqcc-help-figure hqcc-help-figure--wide" markdown="span">
  ![Side-by-side comparison of Hero Card properties and Labelled Back properties.](../assets/placements/p019--making-cards-understand-template-specific-card-controls--which-controls-does-each-template-provide.jpg)
  <figcaption>Different templates expose different Properties because their layouts support different card parts.</figcaption>
</figure>
<!-- help-visual:p019:end -->


| Template | Main template-specific controls |
| --- | --- |
| **Hero Card** | Hero name and image, background tint, Attack, Defend, Body and Mind stats, card text, and copyright. |
| **Monster Card** | Monster name and image, background tint, Monster icon, Movement, Attack, Defend, Body and Mind stats, card text, and copyright. |
| **Small Artwork** | Card title and image, card text, border colour, background tint, and copyright. |
| **Large Artwork** | Card title and image, card text, border colour, background tint, and copyright. |
| **Rules** | Name, rules text, and copyright. |
| **Hero Back** | Name, background tint, a back logo, back text and its backdrop, and copyright. |
| **Logo Back** | Name, background tint, a back logo, and copyright. |
| **Labelled Back** | A configurable back label, back image, optional back text and its backdrop, border colour, background tint, and copyright. |

Hero Back and Logo Back use the same built-in and saved custom-logo choices. Labelled Back uses an ordinary back image instead, so its image is chosen from Assets.

## Where do I change them?

Open or create a card, then select **Properties** beside the card preview. Expand a section when necessary and make a change while watching the card. Save when the result is correct.

Some sections offer more than their main text or number field. Look for colour swatches, visibility switches, adjustment buttons, or an options menu beside the field.

For detailed procedures, see:

- [Use Advanced Hero and Monster Controls](./use-advanced-hero-and-monster-controls.md)
- [Customize Titles Colours and Copyright](./customize-titles-colours-and-copyright.md)
- [Customize Card Back Logos and Text](./customize-card-back-logos-and-text.md)
- [Add and Position Artwork](./add-and-position-artwork.md)
- [Understand Body Text Tools](./understand-body-text-tools.md)
- [Format Card Text](./format-card-text.md)

If an expected control is missing, see [Fix Template Control Problems](../troubleshooting/fix-template-control-problems.md).
