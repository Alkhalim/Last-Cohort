# Last Cohort — project instructions

## Versioning rule

**Every commit must bump the version number** in `index.html`
(`<span class="version-label">vX.Y.Z</span>`, currently the single source of
truth for the displayed version).

- Patch bump (`v0.4.19` → `v0.4.20`) for fixes, tuning, text, and polish.
- Minor bump (`v0.4.x` → `v0.5.0`) for new systems or content waves
  (new mechanics, new screens, item/achievement batches).
- Include the version change in the same commit as the work it versions.

The version label doubles as the cache/QA reference for testers ("which
version are you on?"), so a commit without a bump makes bug reports
ambiguous.
