## Why

`packages/contracts/src/index.ts` is a 293-line flat file that mixes schemas from ten distinct capabilities in a single namespace. Every new feature appends to the same file, making it a guaranteed merge conflict hotspot as the team grows and an unclear home for any new schema.

## What Changes

- Split `packages/contracts/src/index.ts` into one file per capability domain
- Add a thin barrel `index.ts` that re-exports everything — zero breaking changes to existing imports
- Align the contracts file structure with the existing `openspec/specs/` capability names

## Capabilities

### New Capabilities

- `contracts-organisation`: Structural convention for how `packages/contracts` is organised — one file per capability, barrel re-export, naming rules.

### Modified Capabilities

_(none — no spec-level behaviour is changing; this is a file organisation refactor)_

## Impact

- **`packages/contracts/src/`**: New files added; `index.ts` reduced to re-exports only
- **`apps/api` and `apps/web`**: Zero import changes required — barrel re-export preserves all existing `@kawal/contracts` import paths
- **No runtime behaviour change**: Zod schemas and inferred types are identical after the split
- **Future features**: Each new capability adds a new file instead of appending to `index.ts`
