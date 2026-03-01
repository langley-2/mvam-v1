# MVAM Builder

A desktop app for creating and managing **Minimum Viable Architecture (MVAM)** templates. Each project can hold multiple versioned templates (v1, v2, …), covering all nine MVAM sections from requirements through to failures and learnings.

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 18+ (tested on v23) |
| npm | 8+ |
| macOS | 12 Monterey+ (for the packaged app) |

---

## Running

### Development (browser, with hot reload)

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

### Development (Electron window, with hot reload)

```bash
npm run electron:dev
```

### Build a standalone Mac app

```bash
npm run package
# Output: release/mac-arm64/MVAM Builder.app
```

Drag `MVAM Builder.app` to `/Applications` to install. On first launch, right-click → Open to bypass the unsigned-app Gatekeeper prompt.

---

## Project Structure

```
mvam/
├── electron/
│   └── main.cjs          # Electron main process
├── public/
│   └── favicon.svg       # App favicon
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Root component — state, routing between sections
│   ├── index.css         # All styles (CSS custom properties, no CSS modules)
│   ├── storage.js        # localStorage read/write, data factory functions
│   ├── templates.js      # Default markdown templates, checklist definitions
│   ├── components/
│   │   ├── Sidebar.jsx        # Project/version tree navigation
│   │   ├── SectionNav.jsx     # Nine-tab section bar
│   │   ├── MarkdownEditor.jsx # Edit / Split / Preview markdown editor
│   │   ├── Checklist.jsx      # Reusable checkbox list with progress counter
│   │   └── DiagramUpload.jsx  # Image upload (base64) + external link input
│   └── sections/
│       ├── MarkdownSection.jsx    # Generic markdown section (Requirements,
│       │                          # Architecture, Scaling & Cost, Code Structure)
│       ├── SystemDiagram.jsx      # Diagram + checklist + component cards
│       ├── SequenceDiagram.jsx    # Multiple flows, each with diagram + checklist
│       ├── OtherDiagrams.jsx      # Optional supplementary diagrams
│       ├── FailuresLearnings.jsx  # Markdown log + proofs checklist + RAID grid
│       └── Links.jsx              # Categorised link list
├── index.html
├── vite.config.js
└── package.json
```

---

## Architecture

### Stack

| Layer | Choice | Reason |
|---|---|---|
| UI framework | React 18 + Vite 5 | Minimal setup, fast HMR, good Electron compatibility |
| Desktop shell | Electron 28 | Packages the web app as a native Mac `.app` |
| Markdown | `marked` (GFM) | Lightweight, no server required |
| Storage | `localStorage` | Zero infrastructure — fully local, no auth, no sync |
| Styling | Plain CSS + custom properties | No build-time CSS dependency, easy to read and change |

### Key decisions

**No database.** All data lives in `localStorage` under the key `mvam_builder_v1`. The full project tree is serialised as a single JSON document on every change. This keeps the app dependency-free and trivially portable.

**Images as base64.** Diagram screenshots are stored as base64 data URIs in localStorage. Browser storage is typically capped at 5–10 MB; a warning is shown if a write fails with `QuotaExceededError`.

**Vite `base: './'`.** Required so asset paths in `dist/index.html` are relative (`./assets/…`) rather than absolute (`/assets/…`). Absolute paths break when Electron loads files from the ASAR archive via `file://`.

**Icon assets out of `public/`.** The Electron app icon (`build/icon.png`) must **not** live in `public/`, because Vite copies everything in `public/` into `dist/`, which gets packed into the ASAR alongside web assets. Binary files mixed in with the ASAR's text assets corrupt the archive.

### Data model

```js
// localStorage key: "mvam_builder_v1"
{
  projects: {
    [projectId]: {
      id, name, createdAt,
      versions: {
        [versionId]: {
          id, name, createdAt,
          requirements:      { content: string },
          architecture:      { content: string },
          scalingCost:       { content: string },
          systemDiagram:     { checklist, components[], imageData, link, notes },
          sequenceDiagram:   { flows[] },
          otherDiagrams:     { diagrams[] },
          codeStructure:     { content: string },
          failuresLearnings: { content, proofs, raid },
          links:             { items[] }
        }
      }
    }
  }
}
```

### Electron security

- `nodeIntegration: false` — renderer has no Node.js access
- `contextIsolation: true` — preload and renderer run in separate contexts
- `isSafeExternalUrl()` guard on `shell.openExternal` — only `http:` and `https:` URLs are passed to the OS
- `will-navigate` handler prevents the Electron window from navigating away from local files
- `marked` renderer configured with `html: () => ''` — raw HTML blocks in markdown are stripped before rendering, preventing script injection via `dangerouslySetInnerHTML`

---

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm run build` | Production Vite build → `dist/` |
| `npm run electron:dev` | Vite + Electron together with hot reload |
| `npm run package` | Vite build + electron-builder → `release/mac-arm64/MVAM Builder.app` |
| `npm run package:dmg` | Same but produces a distributable `.dmg` |
