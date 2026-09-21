# Release Taffy

Use GitHub **Releases** for downloads; keep installers out of Git source history. A public release has a stable link such as:

`https://github.com/langley-2/mvam-v1/releases/latest/download/Taffy-Setup-x64.exe`

That URL is a planned download link, not evidence of an existing published release. A private repository’s assets require access. A separate public downloads repository is an option if the source should stay private.

## Automated path

1. Commit the reviewed changes, including the lockfile, build scripts, logo and workflows. Leave local notes (`agentic_uplift.md`, `may_review.md`), `.env*`, credentials and `release/` out of the commit.
2. Push the changes and run **Build release candidate** manually in GitHub Actions. It checks dependencies, scans source/history, runs tests, builds on Windows and macOS, inspects each application archive, and uploads installer artifacts.
3. On a clean Windows machine, install, launch, create a project/version, toggle guided mode, save context, restart, and confirm persistence. Add your own API key and review a text section and PNG diagram in both modes. Confirm guided context is sent only in guided mode. Remove the key and verify Archie is disabled after restart. Test repository selection with a harmless sample repository and Git installed. Check uninstall/reinstall preserves the expected data.
4. Smoke-test the Mac build too. Signing and notarization remain a separate release requirement for a smooth public installation experience. The Windows installer is unsigned; macOS uses an ad-hoc signature only. Do not describe either as publisher-verified.
5. Set `package.json` and lockfile version together, create the matching `v...` Git tag, and push it. The workflow creates a **draft** release containing both installers and SHA-256 checksums. Review the artifacts and release notes, then publish the draft. The latest-download URL starts working once an appropriate public release exists.

For a manual release, attach only `Taffy-Setup-x64.exe`, the intended `.dmg`, and checksums to a draft GitHub Release. Do not upload the entire `release/` directory: builder debug files can include local machine paths. Do not upload application-data folders or exports from personal projects.

## Local commands

```sh
npm ci
npm audit --audit-level=moderate
npm test
npm run check:secrets
npm run package:win
npm run package:dmg
npm run check:release
```

Windows builds are x64. The Mac workflow uses an Apple Silicon runner. No automatic update mechanism is installed; users download a new installer for updates. Git is optional for ordinary editing and required for repository analysis.

## Signing

Configure publisher signing credentials as GitHub Actions secrets, never source files or frontend `VITE_*` environment variables. The current build is deliberately a preview configuration; Windows Authenticode and macOS Developer ID/notarization need the owner’s certificates/accounts. Change the Mac ad-hoc identity only when configuring Developer ID signing. Keep Electron’s archive-integrity and fuse hardening enabled.

See [Electron’s fuse guidance](https://www.electronjs.org/docs/latest/tutorial/fuses) and [electron-builder’s publishing documentation](https://www.electron.build/publish/).
