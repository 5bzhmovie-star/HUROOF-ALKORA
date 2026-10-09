# Mini Games Official Release Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a server-backed, multi-device Mini Games release for all 31 games with real visual assets, invite/buzzer/display flows, admin controls, and ten-minute inactive-room cleanup.

**Architecture:** Store canonical rounds in D1/SQLite and project them by role through a dedicated mini-room service. Keep the solution server-only until reveal. Render structured visual payloads in a small set of responsive React templates, and use direct licensed media URLs with visible credits.

**Tech Stack:** React 19, TypeScript, Node HTTP, Cloudflare Worker/D1, SQLite, Vinext/Vite.

---

### Task 1: Lock the content contract with failing tests

**Files:**
- Create: `tests/mini-games.test.mjs`
- Create: `server/mini-content.mjs`
- Create: `seed/mini-games.json`

- [ ] Assert 31 catalog slugs have published rounds.
- [ ] Assert every round has a valid source, solution, accepted answers, and visual payload.
- [ ] Assert every referenced media entity has a real URL and fallback.
- [ ] Run the test and confirm it fails before implementation.

### Task 2: Add persistent mini-room domain and API

**Files:**
- Create: `server/mini-rooms.mjs`
- Modify: `server/schema.sql`
- Modify: `db/schema.ts`
- Create: `drizzle/0003_mini_games_official.sql`
- Modify: `server/database.mjs`
- Modify: `server/index.mjs`
- Modify: `app/api/[...path]/route.ts`

- [ ] Seed content idempotently at runtime, not in migrations.
- [ ] Add create/get/join/buzz/action/QR APIs with role projections.
- [ ] Add audio replay count limited to two.
- [ ] Add sliding ten-minute expiry and destructive cleanup for inactive rooms.
- [ ] Add integration tests for privacy, simultaneous buzzer, scores, and expiry.

### Task 3: Build setup, host, display, and buzzer interfaces

**Files:**
- Rewrite: `client/MiniGames.tsx`
- Modify: `client/App.tsx`
- Modify: `client/api.ts`
- Modify: `app/globals.css`

- [ ] Replace local demo state with create/setup page.
- [ ] Add host room with hidden code, invitation dialog, QR, controls, score, and sources.
- [ ] Add display-only and participant buzzer routes.
- [ ] Render flags as images, real club crests, licensed player/stadium photos, positions, names on reveal, and robust fallbacks.
- [ ] Add responsive layouts for phone, tablet, desktop, and TV.

### Task 4: Add administration and retention controls

**Files:**
- Modify: `server/admin.mjs`
- Modify: `app/api/[...path]/route.ts`
- Modify: `client/Admin.tsx`
- Modify: `client/App.tsx`

- [ ] Add Mini Games content list/edit/publish/hide/delete actions.
- [ ] Add Mini Games room list to room management.
- [ ] Update privacy/rules text to explain ten-minute inactive-room deletion and media/audio behavior.

### Task 5: Verify and publish

**Files:**
- Modify: `README.md`

- [ ] Run content/source validators and all tests.
- [ ] Run self-host and Sites production builds.
- [ ] Inspect the managed preview at phone and desktop/TV widths.
- [ ] Commit and push the exact tested source.
- [ ] Save and deploy the new Sites version, then wait for `succeeded`.
