# Client Portal Workspace

Phase 3 added the TypeScript package boundary that later portal phases now use.
The repo still preserves the current `Frontend`, `Backend`, and `Terraform`
folders.

## Current Package Layout

```text
package.json        Root convenience scripts and validation entrypoint
Frontend/           Vite React app and authenticated portal UI
Backend/            TypeScript portal API plus .NET rollback project
Shared/             Shared TypeScript/Zod schemas
Terraform/          Bootstrap and App infrastructure roots
```

The root `package.json` intentionally does not replace the frontend package
flow. Existing deployment scripts still run `npm ci` inside `Frontend`.

## Shared Package

The shared package lives at:

```text
Shared/
```

Package name:

```text
@apopto/shared
```

It exports shared Zod schemas and inferred TypeScript types from:

```text
Shared/src/index.ts
```

Schema families include:

- core status enums and API envelope shapes
- intake/profile requests and responses
- dashboard summaries and feature flags
- file upload/list/download contracts
- message thread/message contracts
- billing contracts
- admin request and response contracts

`Shared` must build before clean frontend/backend builds that consume
`@apopto/shared`.

## Commands

Build the shared package from the repo root:

```bash
npm run build:shared
```

Typecheck the shared package from the repo root:

```bash
npm run typecheck:shared
```

Run the full validation matrix:

```bash
npm run validate:repo
```

Build the existing frontend directly from `Frontend`:

```bash
npm --prefix Frontend run build
```

When the frontend imports `@apopto/shared`, build the shared package first:

```bash
npm run build:shared
npm --prefix Frontend run build
```

The frontend depends on the shared package through a local package dependency:

```text
@apopto/shared = file:../Shared
```

No path alias is required for the frontend smoke test. Vite resolves the package
through `Frontend/node_modules`, and the package export points at
`Shared/dist/index.js`. This means `Shared` must be built before frontend builds
in a clean checkout.

Backend TypeScript imports use the same package path:

```ts
import { FeatureFlagsSchema } from '@apopto/shared';
```

Build the TypeScript backend from the repo root:

```bash
npm run build:backend
```

Typecheck the backend scaffold from the repo root:

```bash
npm run typecheck:backend
```

The backend scaffold depends on the shared package through a local package
dependency:

```text
@apopto/shared = file:../Shared
```

No path alias is required for the backend scaffold. TypeScript resolves the
package through `Backend/node_modules`, and the package export points at
`Shared/dist/index.js`. This means `Shared` must be built before backend builds
in a clean checkout.

Frontend file organization conventions are documented separately in
`docs/client-portal/frontend-structure.md`.

## Package Manager Assumptions

- The repo already uses npm through `Frontend/package-lock.json`.
- `Shared` has its own `package.json` and lockfile so it can build without
  changing the current frontend install/deploy flow.
- Existing deployment scripts continue to use `Frontend` as the frontend package
  root and still build the `.NET` Lambda package as a rollback artifact.
- `Backend` has its own `package.json` and lockfile so the TypeScript scaffold
  can build and package the Node health Lambda artifact consumed by Terraform.
