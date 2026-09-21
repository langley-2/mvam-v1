# Taffy

A local desktop workspace for architecture notes, diagrams, decisions and interview practice. Projects contain independent versions of nine architecture sections. Archie can review a section or draft notes from a repository using your own OpenAI API key.

## Develop

Use Node.js 22.12+ (Node 22 LTS is pinned in `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Browser keys are held in memory and cleared on reload. To develop in Electron, run `npm run electron:dev` on macOS/Linux. On Windows, run `npm run dev` in one terminal, then `$env:VITE_DEV_SERVER_URL='http://localhost:5173'; npx electron electron/main.cjs` in PowerShell. Git must be installed separately to use repository analysis.

## Guided interview practice

Select a project version, open **Overview**, and turn on **Guided mode**. This setting and the optional job description/context belong to the project and apply to all its versions. Existing projects default to standard mode.

Each section offers a practice prompt. **Practise with Archie** reviews reasoning and communication without requiring a prescribed format, completed checklists or separate component cards when a diagram already explains the design. Scores describe demonstrated reasoning, not hiring eligibility. Turn guided mode off to return to the original documentation rubric. Notes and context are retained; context is only submitted during guided reviews. Overview shows scores for the active mode; a new review replaces that section’s previous score.

PNG, JPEG, GIF and WebP diagrams can be reviewed. SVGs can be displayed in Taffy, but should be exported as PNG before an Archie review.

## Privacy and storage

- Project notes, images, job context and preferences are saved locally in browser/Electron localStorage (`taffy_v1`, `taffy_prefs_v1`). These project records are **not encrypted**. Storage limits still apply; export important versions regularly.
- Desktop API keys are encrypted using Electron `safeStorage` and kept in `secure.json` under the OS application-data directory. The renderer receives only key status. Browser development keys stay in memory.
- Section text and uploaded diagrams are sent to OpenAI only when a review is requested; guided reviews also send the project’s context. Repository analysis has separate submission controls. Repository URLs and Git operations contact the chosen host. Markdown containing remote images can contact the image host when previewed.
- Repository analysis reads selected tracked files without running project builds or tests. Sensitive filename patterns are excluded and common token patterns are redacted. This cannot detect every proprietary detail or secret: use the submission controls and only share repositories you are authorized to submit.
- Each tester supplies their own API key and pays their own provider usage. No shared developer key is bundled.

## Build and verify

```sh
npm test
npm audit --audit-level=moderate
npm run check:secrets
npm run package:win   # Windows x64 installer: release/Taffy-Setup-x64.exe
npm run package:dmg   # macOS disk image for the build machine’s architecture
npm run check:release
```

`npm run package` builds an unpacked app for the current OS. Icons are regenerated from `public/favicon.svg`. The build emits dependency license notices. Packaging includes only built frontend assets, five Electron modules and package metadata. The packaging hook inspects `app.asar` and fails on unexpected files, developer-home paths or common credential patterns. ASAR is an inspectable archive, **not encryption**.

The Windows build currently has no publisher certificate. The Mac build uses an ad-hoc signature for local integrity, not a Developer ID signature or notarization. See [release instructions](docs/RELEASE.md) and the [security review](docs/SECURITY-REVIEW.md) before distribution.

## Source layout

- `src/`: React UI, project storage, templates and browser/IPC adapters.
- `electron/main.cjs`: isolated desktop window, encrypted keys and validated IPC.
- `electron/review.mjs`: shared Archie content builder, standard/guided prompts and provider calls.
- `electron/repositoryAnalysis.cjs`: bounded repository evidence collection and drafting.
- `scripts/`: deterministic icons, license notices and release checks.
- `tests/`: review, privacy, persistence and archive-gate regression tests.
- `.github/workflows/`: checks, native platform builds and draft GitHub Releases.

The repository has no open-source license grant (`UNLICENSED`); choose a license separately if you want to publish the source for reuse.
