---
title: Protect Your Library and Keep It Small
type: concept
status: first-draft
verified: 2026-08-27
app_version: 0.8.1
---
# Protect Your Library and Keep It Small

HeroQuest Card Creator keeps your working library in the browser profile or installed app copy you are using. The app asks the browser to treat that local data as important, but the browser still controls how local site storage is managed.

That means a `.hqcc` backup is the safety copy you control. If your cards, assets, and decks matter, export a backup regularly and keep the downloaded file somewhere outside the app.

## Why backups matter

Browsers normally try to keep local site data, and the app requests extra protection where the browser supports it. That protection reduces the risk of automatic cleanup, but it is not the same as a backup.

Your local library can still disappear if browser data is cleared, a private window is closed, a different browser profile or app copy is used, or the browser decides it needs to recover space. Some browsers ask before granting stronger local-storage protection; others decide automatically based on how often and how recently you use the site.

For browser-specific site data settings, see:

- <a href="https://support.google.com/chrome/answer/14114868?hl=en" target="_blank" rel="noreferrer noopener">Chrome on-device site data help</a>
- <a href="https://support.microsoft.com/en-US/edge/temporarily-allow-cookies-and-site-data-in-microsoft-edge" target="_blank" rel="noreferrer noopener">Edge cookies and site data help</a>
- <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noreferrer noopener">Safari website data help</a>
- <a href="https://support.mozilla.org/en-US/kb/storage" target="_blank" rel="noreferrer noopener">Firefox local site storage settings</a>

For more technical background, see <a href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API" target="_blank" rel="noreferrer noopener">MDN's Storage API overview</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria" target="_blank" rel="noreferrer noopener">MDN's storage quotas and cleanup guide</a>, and <a href="https://web.dev/articles/persistent-storage" target="_blank" rel="noreferrer noopener">web.dev's persistent storage guide</a>.

## Keep image files sensible

Large images make the local library and its backups heavier. Before uploading artwork, prepare the image for the job it needs to do:

- Use JPEG for full-card artwork, card backs, and other opaque background-style images.
- Keep PNG for images that need transparency, such as cut-out character art or icons.
- Avoid source images that are much larger than the card unless you need extra room for zooming and reframing.
- The card output is currently 750×1050, so a full-card image does not usually need to be many times larger than that.
- Smaller artwork windows and icons can usually use smaller source images than full-card backgrounds.

Image quality is a judgement call. A slightly compressed JPEG can be visually indistinguishable on a printed card while using much less space than the original file.

## Use the app's asset tools

The Assets workspace includes tools that can help keep a library tidy:

- **Convert to JPEG** appears for selected PNG files that do not need transparency.
- **Replace** lets you swap one reusable image for a smaller prepared version without choosing that image again on every card.
- Asset details show dimensions and file size so you can spot unusually large uploads.

These tools help, but they do not replace preparing images before upload. If you already know an image is a full-card background with no transparency, saving an optimized JPEG before importing it is usually the cleanest path.

## Practical routine

1. Export a `.hqcc` backup after substantial card, asset, or deck work.
2. Keep that backup outside the browser, such as in your normal documents, cloud drive, or external backup.
3. Review very large assets in the Assets workspace.
4. Replace oversized images with prepared versions where the visual result still looks right.
5. Keep using the same browser profile or installed app copy unless you intentionally export and import your library somewhere else.

See [Back Up and Restore Your Library](./back-up-and-restore-your-library.md) for the backup workflow and [Replace, Convert, and Delete Assets](../managing-your-library/assets/replace-convert-and-delete-assets.md) for asset replacement and conversion.
