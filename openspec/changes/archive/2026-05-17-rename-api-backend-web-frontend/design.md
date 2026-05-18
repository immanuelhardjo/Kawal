## Context

The monorepo has two app packages:
- `apps/api` (`@kawal/api`) — Express-based backend server
- `apps/web` (`@kawal/web`) — React/Vite frontend

The root `package.json` `dev` script already filters by `@kawal/backend` and `@kawal/frontend`, meaning the workspace resolver currently fails to find these packages. The fix requires renaming both the directory and the `name` field in each package's `package.json`.

## Goals / Non-Goals

**Goals:**
- Align directory names, package names, and root scripts consistently under `backend`/`frontend` conventions
- Ensure `pnpm --filter` commands resolve correctly after the rename
- Produce a clean lockfile with no stale references to the old names

**Non-Goals:**
- Changing source code imports within `apps/api` or `apps/web` (internal imports don't reference the package name)
- Renaming packages in `packages/` (e.g., `@kawal/ui`, `@kawal/contracts`) — those are already correctly named
- Adding or removing any functionality

## Decisions

**Decision 1 — Rename directories and package names atomically**
Do both renames (directory + `package.json` name) in a single commit to avoid a transient broken state where the directory name and package name diverge. This keeps `git bisect` clean and avoids CI running against a half-renamed state.

Alternative considered: rename directories first, package names in a follow-up commit. Rejected — adds complexity with no benefit.

**Decision 2 — Regenerate lockfile rather than manually editing it**
Run `pnpm install` after the rename to let pnpm regenerate `pnpm-lock.yaml`. Manual edits to lockfiles are error-prone and pnpm's resolution may change other entries during regeneration.

Alternative considered: manually patch `pnpm-lock.yaml`. Rejected — fragile and harder to review.

**Decision 3 — No source-level import changes needed**
Internal imports within `apps/api` and `apps/web` use relative paths or reference other `@kawal/*` packages (not `@kawal/api` or `@kawal/web`). No source file changes are needed beyond the two `package.json` files.

## Risks / Trade-offs

- **[Risk] CI pipelines may reference `apps/api` or `apps/web` paths directly** → Mitigation: grep for these strings in CI config files and update before merging.
- **[Risk] Lockfile regeneration may pull in minor dependency updates** → Mitigation: review the lockfile diff; use `pnpm install --frozen-lockfile` in CI to catch unexpected changes.
- **[Risk] Git history shows directory as deleted+added, not renamed** → Mitigation: use `git mv` to preserve history via rename detection (`git log --follow`).
