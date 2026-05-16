## 1. Create capability files

- [x] 1.1 Create `packages/contracts/src/common.ts` — move `certaintyLabelSchema`, `lifecycleStateSchema`, `cadenceSchema`, `apiErrorSchema` and their inferred types
- [x] 1.2 Create `packages/contracts/src/cases.ts` — move case, subscription, and what-changed schemas
- [x] 1.3 Create `packages/contracts/src/entities.ts` — move entity type and entity DTO schemas
- [x] 1.4 Create `packages/contracts/src/timeline.ts` — move event type, event DTO, and timeline filter schemas
- [x] 1.5 Create `packages/contracts/src/graph.ts` — move relationship type, relationship DTO, graph filter, and visible graph schemas
- [x] 1.6 Create `packages/contracts/src/ingest.ts` — move ingest phase, ingest request, ingest event, and ingest activity schemas
- [x] 1.7 Create `packages/contracts/src/users.ts` — move `meResponseSchema`
- [x] 1.8 Create `packages/contracts/src/revisions.ts` — move revision DTO, aggregate type, and list revisions schemas

## 2. Replace index.ts with barrel re-exports

- [x] 2.1 Replace the body of `packages/contracts/src/index.ts` with `export *` statements for each capability file — no schema definitions remain in `index.ts`

## 3. Fix cross-file dependencies

- [x] 3.1 Update any schema in `cases.ts` or `timeline.ts` that references `certaintyLabelSchema` to import from `./common.js` instead of inline
- [x] 3.2 Update `entities.ts` and `graph.ts` similarly for shared primitive types

## 4. Verify

- [x] 4.1 Run `pnpm typecheck` across the monorepo — zero new type errors
- [x] 4.2 Run `pnpm test` — all tests pass
- [x] 4.3 Confirm `packages/contracts/src/index.ts` contains no `z.object`, `z.enum`, or `z.infer` calls
