# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Firefox **Manifest V3** browser extension that overrides the new-tab page with a local-first startpage (search bar + bookmark grid). Vanilla JS, zero dependencies, no `npm`/`node_modules`/bundler. The runtime is three files plus seed data: `manifest.json`, `index.html` (all CSS is inline in a `<style>` block), `script.js`, and `config.json`.

A deeper reference lives in `context/techref_startpage.md` (data models, theme palette, interaction details).

## Architecture

- **Storage is the source of truth, not `config.json`.** On first launch `script.js` `init()` calls `fetch('config.json')` and writes `links` + `search_engine` into `chrome.storage.local`. After that, the seed file is never read again. **Editing `config.json` has no visible effect on an already-installed extension** — you must clear storage (or reinstall) to re-seed. All add/delete edits happen against `chrome.storage.local` and re-render the grid in place via `renderGrid()`, never reloading.
- **Icon resolution is a 3-tier fallback** in `renderGrid()`: local `link.icon` path → Google favicon API (`google.com/s2/favicons`) → auto-colored first-letter block. An empty `icon: ""` skips straight to the API tier.
- **Edit mode** is toggled with `Ctrl+M` (`Escape` closes). It flips the global `isManagementOpen` flag and adds `body.delete-mode`. While active, clicking a bookmark card calls `e.preventDefault()` and deletes it instead of navigating; the bottom-right panel adds new shortcuts.
- MV3 CSP forbids inline JS — all logic stays in `script.js`, linked at the end of `<body>`.

## Build / run

No test suite, no linter. Development is manual in Firefox:

- **Load for dev:** `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → select `manifest.json`. Refresh the tab for HTML/CSS changes; click "Reload" for JS changes.
- **Package a release `.xpi`** (the `packpage` shell function in `cheat.txt`):
  ```bash
  zip -r ../local-startpage.xpi manifest.json index.html script.js config.json icons/
  ```
  The `packpage` function `cd`s into `/home/jim/dev/extensions/browser_startpage` and writes the `.xpi` to the parent dir (`/home/jim/dev/extensions/`).

## Python helper scripts (one-off generators, not part of the extension runtime)

These regenerate/patch `config.json` and `icons/`; they are not shipped in the `.xpi`:

- `extract_history.py` — scans Firefox `places.sqlite`, interactively picks top-visited domains, writes a fresh `config.json`.
- `fetch_icons.py` — downloads each link's favicon into `icons/` and rewrites `icon` paths.
- `fix_config.py` / `update_config.py` — ad-hoc patches that map icons / swap link sets.

All four resolve `config.json`/`icons/` relative to their own location (`__file__`), so they run correctly from anywhere.

## Gotchas

- **No external SVGs** — Firefox extension CSP blocks them; convert icons to flat 128×128 `.png` locally.
- `.xpi` archives are ignored via `.git/info/exclude` (intentionally not `.gitignore`); `.gitignore` itself lists the generator scripts.
- `arch/local-startpage/` is an archived earlier copy of the extension — not the live source.
