# Windows visual studio v2 verification

Approved scope: in-chat design approved 2026-10-18. Built on source branch commit 8b625f243912be269133e0f986facea641d8bb6f; no main merge or force push.

Implemented: offline import of 58 source clubs and 1612 distinct source-player cards; 1316 player photos plus 58 club logos. 296 source cards have no photo. Source snapshots and pending rights/identity statuses remain explicit. Existing edits are preserved by idempotent import. Original image hashes are verified before conversion, then optimized to WebP <=1024 pixels with original source hashes retained. 1374 optimized images total 88,348,590 bytes.

Visual studio: searchable bank with authoritative counts, filters, preview, edit, clone, publish/hide/delete, drafts and simple image questions in addition to careers/lineups. Editor offers drag/drop uploads and per-slot player autofill. Default new rooms mix 25% visual content, drawing only published eligible questions and excluding used IDs. No questions are generated or published automatically from pending source cards. Existing user visual questions remain intact.

Verification evidence:
- Node backend suite: 57 tests; final full run logged during delivery.
- Desktop client TypeScript: `pnpm exec tsc -p tsconfig.desktop.json --noEmit` passes.
- Vite self-host build passes; Cairo regular/bold fonts bundled locally with OFL.
- Actual Chromium UI acceptance passes: local image retrieval, source player lookup/autofill, create/publish, preview, clone/edit/draft, library search and mobile width; zero page errors.
- Windows x64 self-contained .NET publish succeeds. MSB3277 reports an inherited WindowsBase/WPF dependency conflict warning; project is WinForms and compilation succeeds.
- Windows Node 24.19.0 binary SHA256 matches the official distribution checksum.
- ZIP CRC and every bundled optimized-image SHA256 checked; launcher and runtime have valid Windows PE signatures.
- Native Windows GUI execution is unavailable in this Linux environment, so this remains a user-testable Windows build rather than certification of official launch readiness.

Independent review found two important defects and both gained regression coverage: ordinary question editing could publish an incomplete visual draft, and basic-bank reset deleted visual payloads. The ordinary editor now rejects visual IDs, and basic export/reset exclude visual records.

Deferred minor UI observations: deleting the final card on a later page requires Previous; career station search state uses positional keys when removing a station. Neither automatically overwrites data or bypasses validation.

Existing Next/app API TypeScript errors are outside the desktop bundle. Desktop client type checks and self-hosted backend/React bundle are checked separately; no claim is made that the Next hosting path was updated.
