## Context

`packages/contracts/src/index.ts` currently holds all Zod request/response schemas for the entire API surface in a single 293-line file. The file covers ten capability domains — cases, entities, events, timeline, graph, ingest, users, revisions, AI, and shared primitives — all in one flat namespace.

The `openspec/specs/` directory already organises requirements by capability (case-management, entity-dossier, event-timeline, etc.). The contracts package does not mirror this structure, creating a mismatch between how requirements are documented and how the code is organised.

There are no runtime implications. This is a pure file organisation change.

## Goals / Non-Goals

**Goals:**
- One file per capability domain inside `packages/contracts/src/`
- A barrel `index.ts` that re-exports everything — all existing `import ... from '@kawal/contracts'` paths continue to work unchanged
- File names align with the `openspec/specs/` capability names
- Shared primitives (`certaintyLabel`, `lifecycleState`, `apiError`) extracted into `common.ts`

**Non-Goals:**
- No schema changes — Zod definitions are moved, not modified
- No new types or validation logic
- No changes to `apps/api` or `apps/web` import statements (barrel preserves them)
- No changes to `packages/contracts/package.json` exports

## Decisions

### D1 — One file per capability, named after the spec

Map each contracts file to the corresponding `openspec/specs/` directory:

| File | Capability | Schemas it contains |
|------|-----------|---------------------|
| `common.ts` | shared primitives | `certaintyLabelSchema`, `lifecycleStateSchema`, `cadenceSchema`, `apiErrorSchema` |
| `cases.ts` | case-management | `createCaseRequest`, `caseDto`, `listCasesResponse`, `advanceLifecycleRequest`, `subscribeRequest`, `subscriptionDto`, `whatChangedItem`, `whatChangedResponse` |
| `entities.ts` | entity-dossier | `entityType`, `entityDto`, `listEntitiesResponse` |
| `timeline.ts` | event-timeline | `eventType`, `eventDto`, `timelineFilters`, `getTimelineResponse` |
| `graph.ts` | relationship-graph | `relationshipType`, `relationshipDto`, `graphFilters`, `visibleGraphResponse` |
| `ingest.ts` | osint-ingestion | `ingestPhase`, `ingestRequest`, `ingestEvent`, `ingestActivityRecord`, `ingestActivityResponse` |
| `users.ts` | user-management | `meResponse` |
| `revisions.ts` | cross-cutting audit | `revisionDto`, `aggregateType`, `listRevisionsResponse` |

**Alternatives considered:**
- Group by HTTP resource (cases, entities, etc.) — rejected because it duplicates the existing spec naming convention rather than aligning with it.
- Single file with named namespaces (`Cases.createCaseRequest`) — rejected because it changes all import patterns without adding structural clarity.

### D2 — Barrel re-export preserves all existing imports

`index.ts` becomes a pure re-export file:

```ts
export * from './common.js'
export * from './cases.js'
// ...
```

No consumer needs to change their imports. Specific sub-path imports (`@kawal/contracts/cases`) become available for free but are not required.

**Alternative considered:** Remove the barrel and force consumers to import from sub-paths — rejected because it would require touching every import in `apps/api` and `apps/web`, with no benefit at current scale.

### D3 — No sub-path exports added to package.json

The current `package.json` exports only `"."`. Sub-path imports (`@kawal/contracts/cases`) work via TypeScript path resolution without adding explicit `exports` entries. Leave `package.json` unchanged to keep scope minimal.

## Risks / Trade-offs

- **Risk**: A future `export *` name collision if two files export the same name → Mitigation: TypeScript will error at compile time during the refactor; easy to resolve before merge.
- **Risk**: Someone imports from a sub-path (`@kawal/contracts/cases`) before it's added to `package.json` `exports`, which may fail in strict package environments → Mitigation: Document that sub-path imports are unofficial until explicitly added to `exports`.
- **Trade-off**: The barrel `index.ts` hides which capability a type belongs to for consumers who don't look further. Acceptable at current team size; sub-path imports are available if explicitness is needed later.

## Migration Plan

1. Create the new capability files (no deletions yet)
2. Move schema definitions from `index.ts` to their respective files
3. Replace `index.ts` body with barrel re-exports
4. Run `tsc --noEmit` across the monorepo to confirm zero type errors
5. No deployment or rollback needed — this change has no runtime effect
