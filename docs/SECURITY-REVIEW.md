# Release security review — 21 September 2026

## Scope and result

Reviewed the working tree, local Git history, dependency lockfile, Electron privileges/IPC, key storage, provider calls, repository analysis, frontend rendering and packaging. The repository already contained substantial uncommitted work; existing features and local planning notes were preserved.

The initial npm audit reported **23 affected packages: 2 critical, 19 high and 2 moderate**. Updating within the existing version ranges resolved the reported advisories. The resulting full dependency audit reports **zero known vulnerabilities**. This includes build dependencies, not just production dependencies. Electron is now 42.11.6, electron-builder 26.15.3 and Vite 8.3.0; use the committed lockfile with `npm ci`.

No credential-pattern matches were found in eligible working-tree files or reachable local Git history. The archive checks passed for built Windows and macOS application archives, each containing **11 files**: built frontend assets and notices, five Electron modules and package metadata. No dependency directory, `.git`, local planning notes, environment file, encrypted API-key file or developer home path was present in those archives. User data is stored outside the build tree and is not copied by packaging.

These are bounded static and heuristic checks, not a penetration test or a guarantee that every secret or vulnerability has been found. Remote branches absent from the local clone are outside the history scan. Common-key patterns do not detect every custom token or sensitive business fact.

## Pre-push verification

Before pushing, Gitleaks v8.30.1 (downloaded from its official release with the published SHA-256 checksum verified) independently scanned the exact staged source snapshot, all four commits reachable in the fetched local/remote history, and the extracted Windows/macOS application archives. All three scans reported no leaks. Reports were redacted and kept outside the repository. A separate staged-path check confirmed that installers, environment/key files, application data and local planning notes were excluded. The refreshed npm audit again reported zero known vulnerabilities.

## Changes made

| Finding | Change |
|---|---|
| Outdated dependencies, including Electron and build tools | Updated lockfile; CI audits all dependencies and blocks moderate or higher advisories. |
| Packaged app could honor a development-server environment variable | Development URL is honored only when Electron reports an unpackaged app. |
| Privileged IPC needed tighter boundaries | Require trusted top frame; local repository paths must have been selected through the native picker in this session. |
| Browser fallback persisted API keys in plaintext | Browser keys are memory-only; old fallback entries are removed. Desktop keys remain OS-encrypted and key files use owner-only permissions on POSIX. Key-deletion failures are reported. |
| Raw provider and Git errors could reflect submitted secrets | Show bounded, generic errors rather than raw remote error bodies or Git stderr. Provider calls have timeouts. |
| Repository path and transport risks | Resolve real paths to prevent parent-symlink escapes; reject credential-bearing/query-bearing remotes and unsafe transports; disable Git hooks/fsmonitor for app operations; bound stderr. |
| Sensitive filenames could enter the provider’s file-tree evidence | Filter sensitive and ignored paths from the submitted tree as well as file contents. |
| Broad packaging and obsolete release instructions | Explicit runtime allowlist, archive inspection hook, no runtime `node_modules`, bundled license notices, Windows NSIS target and draft-release workflow. |
| Electron runtime capabilities unnecessary for the app | Disable RunAsNode, NODE_OPTIONS and Node inspect flags; enable embedded archive-integrity validation and ASAR-only loading. Deny permission requests and webview attachment. |
| Duplicate browser/desktop review implementations | Shared review module with tests for guided/standard context separation and safe result validation. |

Electron’s renderer sandbox, context isolation, disabled Node integration, restricted external-link handling, DOMPurify markdown sanitation and CSP remain in place. Production CSP no longer includes development localhost connection exceptions. Fuses follow [Electron’s documented hardening controls](https://www.electronjs.org/docs/latest/tutorial/fuses).

## Verification

- 13 automated tests cover guided review payloads, diagram evidence, standard-mode context exclusion, bounded context, provider schema/error safety, key-free IPC, transport validation, symlink escape prevention, evidence filtering, project persistence, memory-only browser keys and archive-gate rejection cases.
- Production Vite builds and Windows/macOS packaging completed with the archive gate enabled.
- Browser UI checks exercised project/version creation, guided prompts, next-section navigation, reload persistence, retained job context, standard-mode switching without losing notes, and light/dark styling.
- Provider calls in tests are mocked. No real API key or project content was submitted for QA, so live model quality and billing behavior still need a voluntary smoke test with sample data.
- The final packaged Mac app launched and rendered successfully. Its ad-hoc signature passed `codesign --verify --deep --strict`; the Windows installer has no Authenticode certificate. Runtime fuses were read back from both packaged apps.
- Windows installation and execution cannot be verified on this Mac. Complete the Windows smoke test in `RELEASE.md` before publishing.

## Remaining release considerations

The Windows preview installer has no publisher signature. The macOS preview uses an ad-hoc signature, not Developer ID signing/notarization. These are test builds, and normal operating-system trust prompts can remain. The release workflow deliberately creates drafts, not public releases.

Project documents, images and interview context remain unencrypted localStorage data; only the desktop API key is encrypted. Repository redaction cannot ensure that every private fact is removed. A requested AI review transmits the relevant content to OpenAI. Markdown can load remote image URLs while previewing. Desktop requests already started may continue until their timeout if the UI closes the feedback panel, although stale results are not applied after navigation.

`agentic_uplift.md`, `may_review.md`, legacy iconset intermediates, build outputs and OS metadata are excluded from publication/build inputs rather than deleting the owner’s local files. Publish only the chosen installer/disk image and checksums, never the entire build-output or user-data directory. Source reuse rights remain unspecified (`UNLICENSED`).
