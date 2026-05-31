```markdown
# Local Startpage Extension — Technical Reference

> **Purpose**: This document is an LLM-optimised comprehensive reference for the `local-startpage` browser extension project.
It contains exact architectures, file structures, data models, state management logic, DOM interaction patterns, and UI components as of **May 2026**.
---

## 1. Project Identity

| Field | Value |
|---|---|
| **Package name** | `local-startpage` |
| **Extension ID** | `{e1234567-89ab-cdef-0123-456789abcdef}` |
| **Version** | `1.1` |
| **Root path** | `/home/jim/dev/extensions/browser_startpage/` |
| **Target platforms** | Firefox (Manifest V3) |
| **Single-user** | Yes — local profile-bound execution |
---

## 2. Technology Stack & Dependency Versions

### Runtime Environment

| Component | Version Constraint |
|---|---|
| Browser Engine | Firefox Nightly |
| Extension API | Manifest V3 |
| Styling | CSS3 (Glassmorphism, CSS Custom Properties) |
| Logic | Vanilla JavaScript (ES6+, async/await) |

### Dependencies

> [!IMPORTANT]
> This project operates on a **zero-dependency** architecture. There is no `npm`, no `node_modules`, and no Webpack/Vite build steps.

### Key API Patterns (Version-Specific)

- **Manifest V3 CSP**: Inline JavaScript is strictly forbidden. All logic must reside in `script.js` and be linked via `<script src="script.js"></script>` at the bottom of the HTML body.
- **Storage API**: Uses `chrome.storage.local` (Promise-based in Manifest V3) for state persistence.
- **Form Submission**: Semantic `<form>` elements handle implicit `Enter` keypresses without needing manual keyboard event listeners bound to inputs.
---

## 3. File Tree

```text
browser_startpage/
├── manifest.json                          # MV3 declarations, permissions, ID, and newtab override
├── index.html                             # Pure UI: DOM structure, inline CSS, semantic forms
├── script.js                              # Application logic, storage engine, event listeners
├── config.json                            # First-launch seed data for browser storage fallback
├── icons/                                 # Local asset directory for shortcut images
│   ├── github.com.png
│   └── reddit.com.png
└── .git/
    └── info/
        └── exclude                        # Local stealth ignore rules (ignores .xpi archives)

# Compiled Output (Generated outside the dev folder)
/home/jim/dev/extensions/local-startpage.xpi   # Permanent, packed browser extension archive

```

---

## 4. Storage Architecture (`chrome.storage.local`)

Data is persisted in the browser's internal SQLite profile database, completely decoupled from the local hard drive after first launch.

| Key | Type | Notes |
| --- | --- | --- |
| `links` | `Array<Object>` | Primary grid data. Automatically seeded from `config.json` if empty. |
| `search_engine` | `String` | `'duckduckgo'` or `'google'`. |

---

## 5. Data Models

While technically schema-less JSON, the application enforces the following structural expectations in memory.

### `Link`

```javascript
{
  name: "GitHub",             // Display label
  url: "[https://github.com](https://github.com)",  // Fully qualified URL (https:// prefix enforced)
  icon: "icons/github.com.png" // Relative path to local rasterized graphic
}

```

*Note: If `icon` fails to load or is empty, the UI falls back to an auto-colored character block based on the first letter of the domain/name.*

---

## 6. Core Engine (`script.js`)

The JavaScript logic acts as a unified state controller and DOM reconciler.

### Initialization Sequence (`init()`)

1. Awaits `chrome.storage.local.get(['links', 'search_engine'])`.
2. **Seed Logic**: If `storage.links` is undefined (first-ever launch), `fetch('config.json')` is called. The data is instantly written to `chrome.storage.local` to prime the database.
3. Search engine `<select>` dropdown is updated to match user preference.
4. CSS loader spinner is hidden.
5. Calls `renderGrid(storage.links)` to populate the DOM.
6. Snaps focus to the main search `<input>`.

### Grid Rendering (`renderGrid(links)`)

1. Clears `bookmarksGrid.innerHTML`.
2. Iterates array, constructing `<a>` tags with staggered CSS `slide-up-fade` animations.
3. Evaluates icon rendering vs. fallback letter block.
4. Attaches conditional `click` event listeners to individual cards (intercepting navigation if `isManagementOpen` is true).

---

## 7. DOM State & Interaction Management

State is managed via top-level `let` variables and toggled via global event listeners.

| State Variable | Type | Purpose |
| --- | --- | --- |
| `isManagementOpen` | `boolean` | Tracks whether the `Ctrl+M` overlay is active. Dictates whether clicking a card navigates (false) or deletes (true). |

### Event Listeners

* **Global Keydown**:
* `Ctrl + M`: Toggles `isManagementOpen`, shows/hides `#management-panel`, adds/removes `.delete-mode` class on `body`.
* `Escape`: Closes management panel if active, removes delete mode, returns focus to search bar.


* **Search Form (`submit`)**: Composes `url + query` string based on engine selection and executes `window.location.href`.
* **Add Shortcut Form (`submit`)**: Extracts inputs, auto-prepends `https://`, auto-guesses icon path (`icons/[domain].png`), mutates storage array, re-renders grid instantly without closing the panel.

---

## 8. UI Components & Styling

Styling relies entirely on CSS Custom Properties (`:root`) and standard classes.

### Theme Palette (Catppuccin Macchiato / Slate Inspired)

| Variable | Value | Usage |
| --- | --- | --- |
| `--bg-color` | `#09090b` | Deep obsidian main background |
| `--surface-bg` | `rgba(24, 24, 27, 0.6)` | Glassmorphism base for cards/inputs |
| `--border-subtle` | `rgba(255, 255, 255, 0.05)` | Card boundaries |
| `--accent-color` | `#818cf8` | Buttons, focus rings |
| `--delete-color` | `#ef4444` | Management mode alerts and card hover borders |

### Component Breakdown

* **Search Bar**: Pill-shaped `.search-form` with `backdrop-filter: blur(16px)`. `<select>` engine dropdown is seamlessly integrated with no borders.
* **Bookmark Card**: `display: flex` column. Animates `transform: translateY(-6px)` on hover.
* **Management Overlay**: Fixed `bottom: 24px`, `right: 24px`. Hidden by default.
* **Delete Mode (Visuals)**: When `body.delete-mode` is active, cards receive a CSS `@keyframes jitter` animation to indicate destructive click behavior.

---

## 9. Build, Test, & Run Workflow

### Development (Hot-Reloading)

* Run via `about:debugging#/runtime/this-firefox`.
* Click **Load Temporary Add-on...** and select `manifest.json`.
* **HTML/CSS updates**: Simply refresh the tab (`F5`).
* **JS updates**: Click the **Reload** button in `about:debugging`.

### Production Deployment (The `packpage` Alias)

Compression is handled via a custom `~/.bashrc` wrapper function to avoid manual ZIP syntax.

```bash
packpage() {
    cd /home/jim/dev/extensions/browser_startpage || return
    rm ../local-startpage.xpi
    zip -r ../local-startpage.xpi manifest.json index.html script.js config.json icons/
}

```

*Note: Archiving must be executed entirely flagless to preserve real-time terminal output visibility per security/control policies.*

---

## 10. Known Patterns & Gotchas

* **No SVGs from external domains**: Firefox strictly blocks complex SVGs via extension CSP rules. Use `inkscape` to convert vector icons to flat 128x128 `.png` files locally.
* **`.gitignore` Loop**: Never track `.gitignore` in this project if the goal is local stealth. Use `.git/info/exclude` to hide `.xpi` binaries locally.
* **Link Click Hijacking**: When Delete Mode is active, `e.preventDefault()` stops the default `href` navigation on bookmark cards, allowing the script to splice the storage array and redraw the grid instead.
* **Live Re-rendering**: Deleting or adding a site calls `renderGrid()` directly. This circumvents the need for `location.reload()`, keeping the management overlay perfectly open and focused.

---

## 11. Agent Instruction Format (Antigravity)

When generating implementation instructions for the Antigravity agent, use the following format.
This ensures optimal ingestion and single-pass implementation with minimal errors.

### Structural Rules

* **Prose paragraphs only**. Do not use fenced code blocks (````html`) within the instruction body. Code references should be inline or described structurally.
* **Small single-line identifiers** (e.g., `isManagementOpen`, `renderGrid()`) are acceptable inline.
* **Target file declared at top**. Begin the instruction set with a bolded line stating the exact file path(s) to modify: **Target File: /home/jim/dev/extensions/browser_startpage/index.html**.
* **Technical constraints line**. Immediately after the target file, include a bolded line listing invariant constraints: **Technical Constraints: Vanilla JS, Manifest V3, no inline event handlers.** Do not modify [specific methods/files to leave untouched].

### Ordered Sections

* **Number sections sequentially** (1, 2, 3...) describing modifications in implementation order.
* Each section should cover one logical change: removing old code, adding state, modifying a DOM element, adding a CSS rule, etc.

### Didactic Language

* **Use imperative mood throughout**: "Add...", "Modify...", "Set...", "Replace...", "Ensure...". Do not use passive voice or exploratory language ("you might want to...", "consider...").
* **Explicit property paths**. When describing DOM modifications, specify exact element IDs and class names (e.g., "In the `#add-shortcut-form` element, modify the `onsubmit` attribute to...").
* **Literal values inline**. Colors, radii, opacities, and constants should be given as exact values in the prose (e.g., "blur of 16px", "borderRadius of 20px", "Color(#ef4444)").

### Verification Checklist (Mandatory)

End every instruction set with a bulleted **Behavior Verification Checklist** section.
Each bullet is a single testable behavior written in present tense:

* "Pressing Escape while the management panel is open closes the panel and removes the delete-mode class from the body."
* "Submitting the form with a valid URL appends a new card to the grid without reloading the page."

Do not wrap entire implementation blocks in code fences. Do not assume the agent remembers context from earlier sections; restate element IDs and values explicitly in each section.

```

```
