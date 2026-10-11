# Contextual football library execution plan

Goal: one canonical person, dated roster registrations and separately audited club/nation portraits; preserve historical data without treating it as a current roster.

Authorized scope: user's complete specification and direct instruction to implement autonomously. Execute inline on development/complete-football-library-2026-27, based on atlas-completeness-gate-v1.8. No destructive migration, no final ZIP until content passes acceptance.

- [ ] Add dated squad and participant snapshots with sources and expected IDs, not inferred counts.
- [ ] Add contextual media references and review evidence; validate bytes, SHA256, path containment and jersey context.
- [ ] Update viewer API/UI to propagate team/date, never substitute a generic portrait for a requested team.
- [ ] Audit missing participants, squads, contextual portraits and facts; unknown denominator always blocks release.
- [ ] Gather official roster documents and local assets, retaining source and rights status; never mark an unchecked picture reviewed.
- [ ] Run integration/regression tests and commit verified implementation.
- [ ] Publish branch when authenticated access is available; document exact access failure otherwise.
- [ ] Continue collection, SQLite/JSON/PHP-MySQL export and final acceptance before packaging.

Review focus: missing squad members, historical clubs becoming current, wrong jersey, forged asset metadata, path traversal/symlinks, corrupt bytes, date overlap and ambiguous names.
