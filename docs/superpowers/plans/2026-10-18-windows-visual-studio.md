# Windows Visual Studio Implementation Plan
> Execute inline with superpowers:executing-plans. User approved implementation.
**Goal:** ship the repository library and a practical visual question workflow in the existing Windows game.
**Architecture:** deterministic build-time source pack, idempotent startup import, existing SQLite/API and React editor/bank, existing WinForms WebView2 launcher.
**Tech Stack:** Node 24, SQLite, React/TypeScript, .NET 8 WinForms/WebView2.
**Spec:** docs/superpowers/specs/2026-10-18-windows-visual-studio.md

## Global Constraints
- No admin rights, no destructive data migration; same game identity.
- Local images, source context and pending status retained; no invented identity merges.
- Never expose solutions in public unrevealed projections.

## Review Focus
- Upgrade with edited user records: import must not overwrite them.
- Missing/corrupt image bytes: fail build before shipping an empty catalog.
- Ambiguous names: show source club and retain distinct records.
- Incomplete drafts: persist but never enter a game draw.
- Async editor searches: stale responses must not fill another player slot.

## Task 1 — Offline catalog and autofill
Files: website/scripts/build-source-library.mjs; website/server/source-library.mjs; database startup, Build-Windows.ps1; tests/source-library.test.mjs.
Interface: buildSourceLibrary(sourceRoot,outputDir); installSourceLibrary(dir); existing playerSearch/playerAutofill gain source context and local media.
- [x] Test pack generation, corruption rejection, idempotent import and preservation of manual edits, source-context search/autofill. Observe RED.
- [x] Implement deterministic media extraction with hash/path validation and startup import. Package generated seed.
- [x] Run source library tests and existing autofill tests; commit.

## Task 2 — Visual bank API and simple image contract
Files: server/visual-questions.mjs; server/visual-bank.mjs; server/admin.mjs; rooms.mjs; tests/visual-bank.test.mjs.
Interface: visualBank(filters) returns items,total,page,pageSize,stats; admin visual-detail, visual-clone and existing save/delete. Add type image with image asset and optional caption; public projection hides answer.
- [x] Test filtered counts/pagination, incomplete draft save, publish validation, clone hidden, edit roundtrip, random eligible draws, used exclusion, hidden answers. Observe RED.
- [x] Implement contract, API and draft/publish validation; default new room mixing to 25%.
- [x] Run all backend tests; commit.

## Task 3 — Visual bank/editor/game UI
Files: client/VisualBank.tsx, VisualEditor.tsx, PlayerLookup.tsx, VisualQuestion.tsx, styles; Admin.tsx and room creation.
Interface: VisualEditor accepts initial question and onSaved; VisualBank owns list/editor/preview.
- [x] Build navigable card bank with counts, filters, edit/clone/status/delete actions and empty-state creation.
- [x] Add simple-image workflow, drag/drop upload, per-slot library search, preview, draft save and missing-field feedback. Ignore stale searches.
- [x] Build frontend and inspect UI; verify image/lineup/career previews and editor roundtrip; commit.

## Task 4 — Windows build and verification
Files: .github/workflows/windows-build.yml, desktop scripts, release report.
- [x] Run tests and frontend build, verify generated library counts and image hashes.
- [x] Build win-x64 launcher and portable archive, validate required files; run available smoke checks.
- [x] Fresh review, fix critical/important issues with regression tests, record exact runtime limits.
- [x] Deliver EXE ZIP only after a successful build; do not mislabel source as runnable output.
