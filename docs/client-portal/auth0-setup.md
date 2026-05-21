# Auth0 Setup

Phase 11 adds Terraform support for an API Gateway HTTP API JWT authorizer.
It does not add frontend Auth0 login, `/api/me`, or portal business logic.

## Terraform Variables

Configure these values per environment:

```hcl
auth0_domain   = "your-tenant.us.auth0.com"
auth0_audience = "https://api.your-domain.example"
```

Do not include `https://` in `auth0_domain`. Terraform builds the issuer as:

```text
https://{auth0_domain}/
```

The Auth0 domain and API audience are identifiers, not secrets, but the
committed tfvars currently use placeholder values. Replace them with real
environment values before relying on protected routes.

## API Gateway Authorizer

Terraform creates:

```text
aws_apigatewayv2_authorizer.auth0
```

Configuration:

```text
authorizer_type  = JWT
identity_sources = $request.header.Authorization
issuer           = https://{auth0_domain}/
audience         = auth0_audience
```

`GET /api/health` remains public and does not use this authorizer.

Phase 11 also adds one protected placeholder route:

```text
GET /api/_auth-placeholder
```

That route uses the `identityIntake` placeholder Lambda handler and returns
`501 not_implemented` after JWT validation succeeds. It exists only to make the
authorizer wiring visible and reviewable before real protected routes are
implemented.

CloudFront forwards the `Authorization` header and browser CORS preflight
headers for `/api/*`. See `cloudfront-api-hardening.md` for the API behavior
contract.

## Auth0 API

In Auth0, create an API whose Identifier exactly matches:

```text
auth0_audience
```

Enable RBAC for the API. Add permissions/scopes that match the route model.
Initial client scopes planned for the portal are:

```text
read:me
write:intake
read:client
write:client
read:files
write:files
read:messages
write:messages
read:billing
```

Admin-only scopes planned for later phases are:

```text
admin:clients
admin:messages
admin:billing
admin:files
```

Do not request admin scopes globally in the frontend. Admin scopes should be
requested only when admin flows exist and backend authorization also checks the
internal admin record in DynamoDB. See `internal-admin-seeding.md` for the
`INTERNAL_ADMIN` item model and seed command.

## Scope Rule

API Gateway HTTP API JWT route scopes use "any matching scope" behavior. If a
route lists:

```text
["read:files", "write:files"]
```

then a token with either scope can pass. For this portal, prefer one narrow
scope per route unless a phase explicitly documents why multiple scopes are
safe.

The Phase 11 placeholder route uses:

```text
read:me
```

## Frontend App Requirements

Frontend Auth0 is intentionally deferred. When that phase starts, configure the
Auth0 Single Page Application with local and deployed origins.

Allowed Callback URLs:

```text
http://localhost:5173/callback
https://replace-with-staging-domain/callback
https://replace-with-production-domain/callback
```

Allowed Logout URLs:

```text
http://localhost:5173
https://replace-with-staging-domain
https://replace-with-production-domain
```

Allowed Web Origins:

```text
http://localhost:5173
https://replace-with-staging-domain
https://replace-with-production-domain
```

Allowed CORS Origins should include the same web origins that will call the
API. Terraform's `cors_allowed_origins` should be kept aligned with these
origins.

## Current Boundaries

- `/api/health` is public.
- `/api/_auth-placeholder` is protected and returns only safe `501` output.
- `/api/me`, intake, files, messages, billing, and admin routes are not
  implemented in this phase.
- Auth0 validates identity and token scopes only. Later backend phases must
  still resolve membership/admin status from DynamoDB before returning tenant
  data.
