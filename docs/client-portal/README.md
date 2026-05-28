# Client Portal Documentation

This directory is the operating manual for the Apopto client portal MVP. It
documents the current architecture, deployment flow, data model, and runbooks
without storing real secrets.

## Architecture

The portal preserves the existing repository boundaries:

```text
Frontend/   React/Vite app, marketing pages, Auth0 provider, portal routes
Backend/    TypeScript Lambda handlers, DynamoDB/S3/SES/Stripe integrations
Shared/     Zod schemas and TypeScript types shared across app layers
Terraform/  Bootstrap and App infrastructure roots
scripts/    CI/CD validation, packaging, and deployment commands
```

The frontend still serves public marketing pages, then uses protected React
routes for portal features:

```text
/callback
/dashboard
/intake
/files
/messages
/messages/:threadId
/billing
/admin/clients
/admin/clients/:clientId
```

Backend API routes are grouped by ownership so each Lambda can keep narrow IAM
permissions:

```text
health          GET /api/health
identityIntake  /api/me, /api/dashboard, /api/intake, /api/client/profile
files           /api/files, presign, complete, download-url, soft delete
messages        /api/threads and /api/threads/{threadId}/messages
billing         /api/billing and /api/billing/stripe-portal-session
admin           /api/admin/clients and client detail/status/project routes
```

Auth0 is identity and token validation only. DynamoDB remains the source of
truth for users, clients, memberships, internal admins, intake, projects, files,
messages, invoices, and audit events. Normal client routes resolve the client
from the authenticated subject and membership records; they must not trust a
frontend-provided `clientId`.

## Infrastructure

The App Terraform root owns the staging/production website, API, Lambda
functions, DynamoDB table, private upload bucket, GuardDuty malware protection,
EventBridge scan handling, API Gateway authorizer, CloudFront API routing,
optional WAF settings, and observability resources.

Infrastructure changes should follow this rule:

```text
Terraform plans for infra phases must be reviewed before apply.
```

Do not run `terraform apply` from a phase unless the operator explicitly
approves that apply. CI validation must not apply Terraform.

## Runbooks

- `auth0-setup.md` covers Auth0 applications, APIs, scopes, origins, and common
  token issues.
- `terraform-deployment.md` covers local and GitHub Actions deployment flow.
- `dynamodb-item-model.md` records the single-table item shapes and access
  patterns.
- `file-upload-flow.md` covers direct browser uploads, quarantine, GuardDuty
  scan enforcement, download rules, and S3 object prefixes.
- `internal-admin-seeding.md` covers the DynamoDB `INTERNAL_ADMIN` item and
  manual seed script.
- `cloudwatch-observability.md` covers structured logs, request IDs, retention,
  access logs, and optional paid alarms.
- `ci-validation.md` covers PR validation, packaging checks, and Terraform
  validation.
- `final-acceptance-matrix.md` covers the Phase 50 final integration and manual
  staging acceptance matrix.
- `final-validation-report.md` records the latest Phase 50 validation run,
  cleanup review, and deferred work.
- `parameter-store-secrets.md` documents manually managed SSM Parameter Store
  secrets and the Terraform wiring that references parameter names only.
- `protected-workspace-shell-goal.md` captures the Xavier-inspired protected
  workspace navigation and non-scrolling desktop layout goal.
- `troubleshooting.md` covers the most common local, Auth0, API, Terraform,
  upload, billing, and CI problems.

## Environment Values

Use placeholders in tracked docs and examples:

```text
VITE_AUTH0_DOMAIN=<tenant-domain>
VITE_AUTH0_CLIENT_ID=<spa-client-id>
VITE_AUTH0_AUDIENCE=<api-identifier>
VITE_API_BASE_URL=<api-or-site-origin>
```

Optional backend integrations are safe to leave unset during validation:

```text
SES_FROM_EMAIL=
SES_NOTIFICATION_TO_EMAIL=
STRIPE_SECRET_KEY_PARAMETER_NAME=
```

Never commit real secret values. Runtime secrets belong in manually created
SSM SecureString parameters; Terraform should receive only parameter names.

## Validation

Use the repo validation command before pushing portal work:

```bash
npm run validate:repo
```

That command runs shared, backend, frontend, artifact packaging, and Terraform
format/validate checks. It does not run Terraform plan or apply.
