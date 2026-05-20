# Backend TypeScript Scaffold

Phase 7 added a TypeScript backend package inside the existing `Backend` folder
without removing the `.NET` Lambda project. Phase 9 switches the health Lambda
to the TypeScript artifact while keeping the `.NET` project as rollback code.

## Current Layout

```text
Backend/
  Apopto.Backend/        Existing .NET health Lambda project, rollback only
  artifacts/             Packaged .NET and TypeScript Lambda zips, ignored
  package.json           New TypeScript backend package config
  package-lock.json      New TypeScript backend package lockfile
  tsconfig.json          Strict NodeNext TypeScript build config
  src/
    handlers/health.ts   Minimal Node.js /api/health handler
    shared/              Utility skeletons for later portal handlers
```

## Utility Skeletons

The scaffold includes these small modules for future backend handlers:

```text
src/shared/response.ts
src/shared/logger.ts
src/shared/validation.ts
src/shared/time.ts
src/shared/ids.ts
```

`src/shared/sharedSchemaSmoke.ts` imports `FeatureFlagsSchema` and
`FeatureFlags` from `@apopto/shared` and parses a static feature flag object.
The `src/handlers/health.ts` handler calls that helper so the backend build and
packaged Lambda artifact prove shared schemas are available from the backend
package.

## Build Commands

Build order for a clean checkout:

```bash
npm run build:shared
npm --prefix Backend install
npm run build:backend
```

Additional check:

```bash
npm run typecheck:backend
```

The existing frontend still builds separately:

```bash
npm --prefix Frontend run build
```

## Deployment Boundary

No Terraform resources were changed in this phase. The live API Gateway and
CloudFront `/api/*` behavior still point at the existing `.NET` health Lambda
artifact. The TypeScript backend outputs to `Backend/dist`, which is ignored.

Phase 8 stages that build output into a separate Lambda artifact:

```text
Backend/artifacts/{environment}/portal-api
Backend/artifacts/{environment}-portal-api.zip
```

Phase 9 updates the existing health Lambda to consume that TypeScript zip for
`/api/health`. The existing `.NET` artifact is still produced as a rollback
artifact:

```text
Backend/artifacts/{environment}-backend.zip
```

Later phases can add real portal API handlers and supporting infrastructure.
This scaffold still only contains the minimal health handler and utility
boundary.
