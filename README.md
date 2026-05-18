# Kawal

Personal OSINT workbench for following Indonesian public-interest cases.

Authoritative product spec lives under [`openspec/`](./openspec/). The active change is [`bootstrap-kawal-workbench`](./openspec/changes/bootstrap-kawal-workbench/proposal.md) — read its `proposal.md`, `design.md`, and `specs/**/spec.md` before touching the code.

> **Display vs code language.** All user-facing display text is Bahasa Indonesia. All code (identifiers, types, comments, log messages) is English. A lint rule enforces both directions.

## Stack

- pnpm workspace monorepo
- TypeScript (strict) on both tiers
- Backend: Express, Drizzle ORM + PostgreSQL, Google OIDC (`openid-client`)
- Frontend: React + Vite + Tailwind, React Flow (Peta Kasus + Garis Waktu), i18next (single Bahasa Indonesia locale)
- AI: Gemini (`@google/generative-ai`), NotebookLM (Reconciliation + on-demand audio briefings), Imagen / Nano Banana (shareable cards)

## Layout

```
apps/
  frontend/               React + Vite, the only frontend deliverable
  backend/                Express HTTP entrypoint, the only backend deliverable
packages/
  domain/                 Pure-TS aggregates, value objects, invariants
  application/            Use cases + ports
  infrastructure/         Drizzle repos, Google OIDC, Gemini adapter, source adapters
  ui/                     React primitives that enforce certainty/source rules
  contracts/              Zod schemas shared between apps/backend and apps/frontend
tools/
  eslint-plugin-kawal/    Custom lint rules (no-raw-fact-render, no-editorial-tone, no-bahasa-in-identifiers)
openspec/                 Spec-driven workflow artifacts
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL ≥ 15 (local socket or `DATABASE_URL`)
- A Google Cloud project with an OAuth 2.0 client (redirect URI `http://localhost:3000/auth/google/callback` in dev)
- A Gemini API key

## Run locally

```sh
pnpm install
cp apps/backend/.env.example apps/backend/.env       # then fill in
cp apps/frontend/.env.example apps/frontend/.env
pnpm db:migrate
pnpm dev                                      # api on :3000, web on :5173
```

## Useful scripts

| Command            | What it does                                         |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Run API and Web concurrently                         |
| `pnpm build`       | Build every workspace package                        |
| `pnpm typecheck`   | TypeScript type-check across the monorepo            |
| `pnpm lint`        | ESLint (incl. Kawal-specific rules)                  |
| `pnpm test`        | Vitest run (unit + integration)                      |
| `pnpm db:migrate`  | Apply Drizzle migrations                             |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |

## License

See [`LICENSE`](./LICENSE).
