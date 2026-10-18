# Windows visual studio — approved scope
User approved the in-chat design on 2026-10-18. Deliver the existing game as a Windows x64 portable EXE with its actual repository library and local images. Preserve user questions and history on upgrades. Expose source snapshot uncertainty without inventing facts or marking pending media licensed.

Library: build an offline catalog from football-library/data/php_source_catalog_2026_10_18 and the matching media bundles. Integrate it into the game database idempotently. Display all source cards and allow name search/autofill with explicit source-club context. Do not merge ambiguous people merely by name. Keep source snapshots distinct from canonical reviewed identities.

Visual bank: searchable/paginated cards with totals by type, status, competition and letter; preview, edit, duplicate, hide/publish and delete. Add a simple image-question type alongside careers and lineups. Editor supports library selection, drag/drop upload, autosuggested answer letter, missing-field validation and prepublication preview. Library data can fill each lineup slot. Drafts may be incomplete; published questions require complete assets. Preserve answers in server-private projections until reveal.

Game: draw published visual questions randomly for the selected letter/tournament, exclude used IDs, configurable 0/25/50/75/100 mixing. Default new rooms to a mixed mode, with text fallback when no eligible visual exists. Show an image question with no identity leakage in alt text, then reveal answer. Keep existing synchronized room projection.

Acceptance: offline pack media hashes checked, fresh install + existing install tested, drafts excluded from draws, editing and cloning persistent, counts authoritative, UI build succeeds, Windows package contains runtime/frontend/server/seeds/library. No claim of native Windows runtime testing without a Windows run.
