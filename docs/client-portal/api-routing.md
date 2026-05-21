# API Routing Strategy

Phase 10 defines future API route ownership without exposing portal feature
routes yet.

## Current Live Route

Terraform currently exposes only:

```text
GET /api/health -> Backend/src/handlers/health.ts
```

That route remains the only working API route in this phase.

## Strategy

Use domain-grouped Lambda handlers instead of one monolithic `/api/*` router.
This matches the current API Gateway model, where Terraform creates explicit
`aws_apigatewayv2_route` resources and attaches each route to an integration.

Future Terraform phases should create one Lambda integration per handler group
and map multiple related API Gateway routes to that group:

```text
health          small public health route
identityIntake  identity, dashboard, intake, editable client profile
files           presigned upload, upload completion, file list/download/delete
messages        threads and thread messages
billing         invoice metadata and Stripe portal session fallback
admin           internal admin client/project/status routes
```

This keeps later IAM permissions narrow. For example, the future files handler
can receive S3 upload permissions without granting them to billing or messages.

## Current Skeletons

The future handler group files exist now:

```text
Backend/src/handlers/identityIntake.ts
Backend/src/handlers/files.ts
Backend/src/handlers/messages.ts
Backend/src/handlers/billing.ts
Backend/src/handlers/admin.ts
```

The admin handler is wired for `GET /api/admin/clients` as of Phase 29. The
remaining future handler groups and admin routes are not wired to Terraform yet.
If invoked directly, unimplemented routes return a safe `501 not_implemented`
response and list the routes owned by that handler group. They do not perform
S3 access, Stripe calls, SES calls, or message handling.

Phase 11 wires only `GET /api/_auth-placeholder` to the `identityIntake`
placeholder handler behind the Auth0 JWT authorizer. It is intentionally not a
business endpoint.

The shared route ownership table lives at:

```text
Backend/src/router/routeOwnership.ts
```

The safe placeholder handler factory lives at:

```text
Backend/src/router/notImplemented.ts
```

## Route Ownership

| Route | Owner | First implementation phase |
| --- | --- | --- |
| `GET /api/health` | `health` | 9 |
| `GET /api/_auth-placeholder` | `identityIntake` | 11 |
| `GET /api/me` | `identityIntake` | 16 |
| `GET /api/dashboard` | `identityIntake` | 26 |
| `GET /api/intake` | `identityIntake` | 23 |
| `PUT /api/intake` | `identityIntake` | 23 |
| `PATCH /api/client/profile` | `identityIntake` | 25 |
| `POST /api/files/presign-upload` | `files` | 35 |
| `POST /api/files/{fileId}/complete` | `files` | 35 |
| `GET /api/files` | `files` | 36 |
| `GET /api/files/{fileId}/download-url` | `files` | 36 |
| `DELETE /api/files/{fileId}` | `files` | 36 |
| `GET /api/threads` | `messages` | 38 |
| `POST /api/threads` | `messages` | 38 |
| `GET /api/threads/{threadId}/messages` | `messages` | 38 |
| `POST /api/threads/{threadId}/messages` | `messages` | 38 |
| `GET /api/billing` | `billing` | 41 |
| `POST /api/billing/stripe-portal-session` | `billing` | 41 |
| `GET /api/admin/clients` | `admin` | 29 |
| `GET /api/admin/clients/{clientId}` | `admin` | 30 |
| `PATCH /api/admin/clients/{clientId}/status` | `admin` | 30 |
| `POST /api/admin/clients/{clientId}/projects` | `admin` | 30 |

## Terraform Rule

Do not add protected API Gateway routes until their implementation phase, or
until an explicit phase asks for a placeholder route. If placeholder routes are
temporarily exposed, they must return only safe `501 not_implemented` responses
and must not claim auth, data access, uploads, messages, or billing behavior.

When later phases wire routes, use route keys that match the ownership table so
the internal placeholder matcher and docs stay aligned:

```text
METHOD /api/path
```

Examples:

```text
GET /api/me
POST /api/files/{fileId}/complete
GET /api/admin/clients/{clientId}
```
