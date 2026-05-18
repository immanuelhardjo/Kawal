## ADDED Requirements

### Requirement: Backend app package identity
The workspace package for the Express server SHALL be named `@kawal/backend` and reside at `apps/backend/`.

#### Scenario: Package resolves by correct name
- **WHEN** a developer runs `pnpm --filter @kawal/backend <script>`
- **THEN** pnpm resolves the package in `apps/backend/` and executes the requested script

#### Scenario: Directory name matches package role
- **WHEN** a developer navigates the `apps/` directory
- **THEN** they see `backend/` (not `api/`) as the server application folder

### Requirement: Frontend app package identity
The workspace package for the React/Vite application SHALL be named `@kawal/frontend` and reside at `apps/frontend/`.

#### Scenario: Package resolves by correct name
- **WHEN** a developer runs `pnpm --filter @kawal/frontend <script>`
- **THEN** pnpm resolves the package in `apps/frontend/` and executes the requested script

#### Scenario: Directory name matches package role
- **WHEN** a developer navigates the `apps/` directory
- **THEN** they see `frontend/` (not `web/`) as the client application folder

### Requirement: Root dev script consistency
The root `package.json` `dev` script SHALL reference `@kawal/backend` and `@kawal/frontend` exclusively, with no references to `@kawal/api` or `@kawal/web`.

#### Scenario: Dev script starts both apps
- **WHEN** a developer runs `pnpm dev` from the monorepo root
- **THEN** both `apps/backend` and `apps/frontend` dev servers start without filter resolution errors
