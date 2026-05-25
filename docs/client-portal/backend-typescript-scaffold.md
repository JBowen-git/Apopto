# Backend TypeScript Package

The portal backend now runs through a TypeScript package inside the existing
`Backend` folder. The legacy `.NET` health Lambda project remains as rollback
code and is still packaged by the release artifact script.

## Layout

```text
Backend/
  Apopto.Backend/        Legacy .NET health Lambda project, rollback only
  artifacts/             Packaged .NET and TypeScript Lambda zips, ignored
  package.json           TypeScript backend package config
  package-lock.json      Backend npm lockfile
  tsconfig.json          Strict NodeNext TypeScript build config
  src/
    admin/               Admin client list/detail/status/project services
    auth/                Auth0 claim parsing and admin checks
    billing/             Invoice metadata and Stripe portal scaffold
    dynamodb/            Key builders, item builders, repository utilities
    files/               File safety, metadata, presign, scan result handling
    handlers/            Lambda entrypoints by API handler group
    messages/            Thread/message services and optional SES notifications
    router/              Route ownership definitions
    shared/              Logging, response, validation, ids, time helpers
    tenant/              Tenant resolver, feature flags, dashboard, intake
```

## Handler Groups

```text
handlers/health.ts          GET /api/health
handlers/identityIntake.ts  /api/me, dashboard, intake, client profile
handlers/files.ts           file upload/list/download/delete routes
handlers/messages.ts        thread/message routes
handlers/billing.ts         billing metadata and Stripe portal scaffold
handlers/admin.ts           admin client routes
```

See `api-routing.md` for route ownership and auth boundaries.

## Build And Test

Clean build order:

```bash
npm run build:shared
npm --prefix Backend ci
npm run build:backend
npm run typecheck:backend
npm run test:backend
```

Full repo validation:

```bash
npm run validate:repo
```

## Packaging

Release packaging creates:

```text
Backend/artifacts/{environment}-portal-api.zip
```

Terraform points the Node.js portal Lambdas at this TypeScript artifact. The
packaging script also creates the legacy rollback zip:

```text
Backend/artifacts/{environment}-backend.zip
```

## Runtime Rules

- Do not log tokens, secrets, presigned URLs, or sensitive body data.
- Private responses should use `Cache-Control: no-store`.
- Validate request bodies with shared Zod schemas.
- Resolve tenants server-side from the Auth0 subject and DynamoDB membership.
- Use scoped IAM per handler group.
- Store files in S3 and metadata in DynamoDB.
