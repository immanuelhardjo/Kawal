## 1. Rename Directories

- [x] 1.1 Run `git mv apps/api apps/backend` to rename the backend directory (preserves git history)
- [x] 1.2 Run `git mv apps/web apps/frontend` to rename the frontend directory (preserves git history)

## 2. Update Package Names

- [x] 2.1 Change `"name": "@kawal/api"` to `"name": "@kawal/backend"` in `apps/backend/package.json`
- [x] 2.2 Change `"name": "@kawal/web"` to `"name": "@kawal/frontend"` in `apps/frontend/package.json`

## 3. Regenerate Lockfile

- [x] 3.1 Run `pnpm install` from the monorepo root to regenerate `pnpm-lock.yaml` with the new package names
- [x] 3.2 Verify no unexpected dependency changes appear in the lockfile diff

## 4. Verify Workspace Resolution

- [x] 4.1 Run `pnpm --filter @kawal/backend typecheck` and confirm it resolves and passes
- [x] 4.2 Run `pnpm --filter @kawal/frontend typecheck` and confirm it resolves and passes
- [x] 4.3 Run `pnpm build` from the root and confirm both apps build successfully

## 5. Scan for Stale References

- [x] 5.1 Search codebase for any remaining references to `apps/api`, `apps/web`, `@kawal/api`, or `@kawal/web` (excluding `pnpm-lock.yaml` and `node_modules`)
- [x] 5.2 Update any CI config files, Dockerfiles, or scripts that reference the old paths or package names
