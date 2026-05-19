## Why

There is no way to preview the full Kasus Detail screen (Garis Waktu, Peta Kasus, Dosier, Profil) in the dev environment without manually calling APIs one-by-one. A seed script with a realistic, high-complexity fixture case lets developers spin up a fully-populated UI in seconds.

## What Changes

- New script `tools/seed-dev.ts` that seeds a complete fictional corruption case ("Kasus Korupsi Pengadaan Alat PCR — RSUD Kabupaten Tambora") into the dev PostgreSQL database
- New `pnpm seed:dev` workspace script wired to `tools/seed-dev.ts` via `tsx`
- Fixture includes: 1 Case, 5 Sources, 5 Entities (person ×2, company ×1, institution ×2), 7 Events, 5 Claims, 6 Relationships — all with proper revision history
- Case lifecycle advances through `open → trial → verdict → appeal` so all 4 revision rows are present
- Script is idempotent (fixed `seed_*` ID prefix, repos upsert on conflict) and targets an existing user by email (`--email` CLI arg)

## Capabilities

### New Capabilities

- `dev-seed-fixture`: A developer tool (TypeScript script) that populates the dev database with a thorough fictional case fixture, covering every aggregate type and all event/relationship/certainty variants used by the UI.

### Modified Capabilities

<!-- none — no existing spec-level requirements change -->

## Impact

- `tools/seed-dev.ts` — new file
- Root `package.json` — new `seed:dev` script entry
- Dev PostgreSQL database — data written on script execution; re-running is safe (upsert)
- No production code touched; no API changes; no schema changes
