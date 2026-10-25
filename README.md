# Taffy

A local desktop workspace for architecture notes, diagrams, decisions and interview practice. Projects contain independent versions of nine architecture sections. Archie can review a section or draft notes from a repository using your own OpenAI API key.

## Download

Download the Windows x64 installer or Apple Silicon macOS disk image from the [current published preview, v1.0.2](https://github.com/langley-2/mvam-v1/releases/tag/v1.0.2). These preview builds are not publisher-signed, so the operating system may show a security warning.

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

## Architecture walkthrough scenarios

Pick a scenario, create a project and work through the architecture sections, using Archie to review your design and trade-offs.

### Cloud architecture

1. Pub/sub architecture for a message publishing system with multiple subscribers, retries and dead-letter queues.
2. Scalable web application with a CDN, load balancer, stateless API and managed database.
3. Event-driven e-commerce checkout coordinating orders, payments and inventory across services.
4. Serverless file-processing pipeline that validates uploads, transforms files and notifies users.
5. Multi-region disaster recovery for a customer portal, covering data replication, failover and recovery targets.

### AI architecture

1. Retrieval-augmented generation (RAG) assistant that answers questions from internal documents with source citations and access controls.
2. Document extraction pipeline that uses AI to classify invoices, extract fields and route uncertain results for human review.
3. **Agentic:** Customer support agent that investigates issues with account tools and requests approval before issuing refunds.
4. **Agentic:** Incident investigation agent that queries logs and metrics, tests hypotheses and proposes remediation for operator approval.
5. **Agentic:** Research agent that plans subtasks, searches sources and revises a cited report after a reviewer agent checks its claims.

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
- `.github/workflows/`: checks, native platform builds and preview GitHub Releases.

Taffy is open-source software licensed under the [Apache License 2.0](LICENSE).
