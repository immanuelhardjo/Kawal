## Why

The monorepo root already uses `@kawal/backend` and `@kawal/frontend` in its `dev` script, but the actual workspace packages are still named `@kawal/api` / `@kawal/web` and live in `apps/api` / `apps/web`. This mismatch breaks `pnpm --filter` resolution and causes confusion when navigating the codebase.

## What Changes

- Rename directory `apps/api/` → `apps/backend/`
- Rename directory `apps/web/` → `apps/frontend/`
- Update `package.json` name field: `@kawal/api` → `@kawal/backend`
- Update `package.json` name field: `@kawal/web` → `@kawal/frontend`
- Regenerate `pnpm-lock.yaml` to reflect new package names

## Capabilities

### New Capabilities
<!-- No new capabilities — this is a pure rename/refactor -->

### Modified Capabilities
<!-- No spec-level requirement changes; this is an infrastructure rename only -->

## Impact

- `apps/api/package.json` — name field updated
- `apps/web/package.json` — name field updated
- `pnpm-workspace.yaml` — already uses `apps/*` glob; no change needed
- `pnpm-lock.yaml` — must be regenerated after rename
- Root `package.json` `dev` script already correct; no change needed
- Any CI scripts or Dockerfiles referencing `apps/api` or `apps/web` paths will need updating
