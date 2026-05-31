# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Firefox WebExtension (Manifest V3) called "YouTube Declutter" that hides video cards on YouTube based on minimum duration and a blocked-creator list, and optionally reformats the homepage/channel grids into a single-column list view. There is no build step — the files are loaded directly by the browser.

There is **no test suite, linter, or package manager** — it's plain JS/CSS/HTML with no dependencies. "Running" the project means loading it in Firefox (below) and verifying behaviour by hand on youtube.com; there are no commands to run beyond packaging.

The extension uses the `browser.*` WebExtension API (e.g. `browser.storage.sync`), which is Firefox's promise-based namespace, not Chrome's `chrome.*`. Porting to a Chromium browser would require swapping that namespace (or shimming it).

## Loading / reloading during development

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** and pick `manifest.json`
3. After editing any file, click **Reload** on the extension's card in `about:debugging`

For a permanent install (unsigned), build a zip and use `about:config` → `xpinstall.signatures.required = false`, then install via `about:addons`.

To package:
```bash
zip -r yt-declutter.xpi manifest.json content.js popup.html popup.js list.css
```

## Architecture

| File | Role |
|---|---|
| `manifest.json` | Declares permissions (`storage`), the content script target (`*.youtube.com/*`), and the popup |
| `content.js` | Injected into every YouTube page; reads settings from `browser.storage.sync`, hides matching cards, and toggles list-view classes on `<html>` |
| `popup.js` | Popup UI logic — loads settings into the form and writes them back |
| `popup.html` | Self-contained popup UI (inline CSS, no external assets) |
| `list.css` | Always-injected stylesheet for list view; rules are scoped under `html.ytd-listmode*` classes so they stay inert until toggled |

### Data flow

Settings are stored in `browser.storage.sync` as `{ minSeconds, hideUnknownDuration, blocked[], listMode, listTextOnly, listHideAvatars, listLowercase }`. The popup reads and writes this object directly. The content script loads settings on init and re-applies them on every `storage.onChanged` event (so changes reflect instantly without reloading the page), every `yt-navigate-finish` event (YouTube SPA navigation), and on DOM mutations (infinite scroll), coalesced to one pass per animation frame.

`DEFAULTS` is duplicated in both `content.js` and `popup.js` — keep the two in sync when adding a setting. The four `list*` keys are sub-options of `listMode`: the popup greys them out when list view is off (`syncListSubOptions`), and both popup save and `applyLayout()` gate each one on `listMode` being true.

### Duration detection

Rather than relying on YouTube's (unstable) CSS class names, `findDurationSeconds` in `content.js` scans card text for all timestamp-shaped strings (`\d{1,2}:\d{2}(?::\d{2})?`) and picks the largest one — the video duration is reliably the longest timestamp present in a card.

### Card selectors

`CARD_SELECTOR` targets four `ytd-*` element types covering the home grid, search results, sidebar, and legacy grid views. YouTube occasionally adds new surface types; if cards stop being filtered, check for new renderer element names and extend `CARD_SELECTOR`.

## List view (CSS-driven)

List view is pure CSS — `content.js` never rebuilds cards, it only toggles classes on `<html>` in `applyLayout()`:

- `ytd-listmode` — single-column rows
- `ytd-listmode-textonly` — also hide video thumbnails
- `ytd-listmode-noavatars` — also hide channel avatars
- `ytd-listmode-lowercase` — lower-case title/metadata text

All layout lives in `list.css`, scoped under those classes so the stylesheet is inert until toggled.

### YouTube DOM dependency (the fragile part)

The homepage/channel grids render each card with YouTube's **`yt-lockup-view-model`** component, whose internal class names are the anchors `list.css` targets:

| Purpose | Selector |
|---|---|
| Card wrapper (made the flex row) | `.ytLockupViewModelHost` |
| Thumbnail link (clamped to 160px) | `a.ytLockupViewModelContentImage` (contains `yt-thumbnail-view-model`) |
| Text column | `.ytLockupViewModelMetadata` / `.ytLockupMetadataViewModelTextContainer` |
| Channel avatar | `.ytLockupMetadataViewModelAvatar` |

The single-column collapse rides on YouTube's own grid variable `--ytd-rich-grid-items-per-row: 1` on `ytd-rich-grid-renderer` (the most stable lever). Legacy `#dismissible` / `ytd-thumbnail` selectors are kept as a fallback for un-migrated surfaces.

**When list view breaks after a YouTube update**, it's almost always these `ytLockup*` class names changing. Confirm against the live DOM by dumping a card's tree in DevTools (`document.querySelector('yt-lockup-view-model')`), then update the selectors in `list.css`. Note: use **synchronous** console snippets — async ones (`setInterval`) trip the debugger on YouTube's caught exceptions.

### Loading skeletons

YouTube shows full-width grey placeholder cards before real content loads. They're hidden in list view via `ytd-rich-item-renderer:not(:has(yt-lockup-view-model))` — i.e. any grid card that has no lockup yet. This self-heals: the card reappears once its content lands. (Requires Firefox ≥ 121 for `:has()`.)
