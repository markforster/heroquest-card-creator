---
title: What Is a Draft?
type: concept
status: first-draft
source_questions: [Q-0009, Q-0010, Q-0011, Q-0015, Q-0189, Q-0192, Q-0195]
verified: 2026-07-22
app_version: 0.8.0
---
# What Is a Draft?

A draft is card work that is currently being edited but has not yet become a saved card. The app keeps the current in-progress draft locally so it can resume after an ordinary reload.

The editor status helps you understand the current state:

- **draft** means the card has not been saved as a named library card yet.
- **saved** means the open card matches its saved version.
- **Modified** means a saved card has changes that have not yet been saved.

## Draft versus saved card

Automatic draft storage protects the current draft from an ordinary reload, but choosing **Save** is what creates the card in **Cards**. A non-empty card title, name, or back label is required before the first save.

<!-- help-visual:p104:start -->
<figure class="hqcc-help-figure hqcc-help-figure--wide" markdown="span">
  ![Four-stage diagram from choosing a template through editing and saving a card to exporting files.](../assets/placements/p104--concepts-what-is-a-draft--draft-versus-saved-card.jpg)
  <figcaption>A template becomes an editable draft, then a saved card; PNG, ZIP, and PDF files are outputs made from it.</figcaption>
</figure>
<!-- help-visual:p104:end -->


Starting another new card can replace the current draft. If the app asks what to do with unsaved work, choose **Cancel** to stay, **Save** to create the card before continuing, or **Discard** to continue without it.

A duplicate also begins as a draft. Its first save creates a new independent card and can inherit collection membership from the saved source card.

## Next

- [Create Your First Card](../getting-started/create-your-first-card.md)
- [What Is a Card?](./what-is-a-card.md)
- [Understand Card States and Saving](../making-cards/understand-card-states-and-saving.md)
