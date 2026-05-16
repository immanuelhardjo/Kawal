# Spec: Contracts Organisation

## Purpose

Defines how TypeScript contract files (Zod schemas) in `packages/contracts/src/` are structured and named — one file per capability domain, with a barrel index that re-exports everything.

## Requirements

### Requirement: Contracts are organised one file per capability
`packages/contracts/src/` SHALL contain one TypeScript file per capability domain. Each file SHALL be named after its corresponding `openspec/specs/` capability (e.g., `cases.ts` for case-management, `ingest.ts` for osint-ingestion). Shared primitives used across capabilities SHALL live in `common.ts`.

#### Scenario: New capability adds a new file
- **WHEN** a new API capability is introduced
- **THEN** its Zod schemas SHALL be added to a new `packages/contracts/src/<capability>.ts` file, not appended to an existing file

#### Scenario: Existing capability schemas are co-located
- **WHEN** a developer looks up the HTTP schema for a given capability
- **THEN** all schemas for that capability SHALL be findable in a single, predictably-named file

### Requirement: Barrel index re-exports all capability files
`packages/contracts/src/index.ts` SHALL contain only `export * from` statements — one per capability file. It SHALL NOT contain any Zod schema definitions directly.

#### Scenario: Existing import paths are unbroken
- **WHEN** any file imports from `@kawal/contracts`
- **THEN** all previously exported names SHALL remain available without any import path changes

#### Scenario: index.ts contains no schema definitions
- **WHEN** `index.ts` is reviewed
- **THEN** it SHALL contain only re-export statements and no `z.object`, `z.enum`, or `z.infer` calls

### Requirement: Capability file names match openspec spec names
The file name stem in `packages/contracts/src/` SHALL match the capability name used in `openspec/specs/`. Where a capability name contains a compound word (e.g., `case-management`), the contracts file SHALL use the noun stem (e.g., `cases.ts`).

#### Scenario: Capability name is traceable
- **WHEN** a developer reads a contracts file name
- **THEN** they SHALL be able to locate the corresponding `openspec/specs/<capability>/spec.md` without ambiguity
