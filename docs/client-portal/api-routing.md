# API Routing Strategy

Portal API routes are grouped by domain instead of a single monolithic
`/api/*` Lambda. This keeps IAM permissions narrow and makes future ownership
clear.

## Handler Groups

```text
health          public health route
identityIntake  identity, dashboard, intake, editable client profile
files           presigned upload, upload completion, file list/download/delete
messages        threads and thread messages
billing         invoice metadata and Stripe portal session fallback
admin           internal admin client/project/status routes
```

Each group maps to explicit API Gateway HTTP API routes in Terraform and a
specific TypeScript Lambda handler.

## Routes

```text
GET    /api/health

GET    /api/_auth-placeholder
GET    /api/me
GET    /api/dashboard
GET    /api/intake
PUT    /api/intake
PATCH  /api/client/profile

POST   /api/files/presign-upload
POST   /api/files/{fileId}/complete
GET    /api/files
GET    /api/files/{fileId}/download-url
DELETE /api/files/{fileId}

GET    /api/threads
POST   /api/threads
GET    /api/threads/{threadId}/messages
POST   /api/threads/{threadId}/messages

GET    /api/billing
POST   /api/billing/stripe-portal-session

GET    /api/admin/clients
GET    /api/admin/clients/{clientId}
PATCH  /api/admin/clients/{clientId}/status
POST   /api/admin/clients/{clientId}/projects
```

## Auth Boundary

`GET /api/health` is public. Portal routes use API Gateway JWT validation and
Lambda-side checks:

- parse Auth0 JWT claims from the API Gateway event
- check route-specific scopes
- resolve tenant context from DynamoDB for client routes
- require Auth0 admin scope plus active `INTERNAL_ADMIN` item for admin routes

CloudFront `/api/*` must forward the `Authorization` header and CORS preflight
headers to API Gateway.

## Response Boundary

Private API responses should use:

```text
Cache-Control: no-store
Content-Type: application/json
```

Error responses should include a stable `error` code, human-readable `message`
when useful, and `requestId`/`correlationId` where available.

## Adding A Future Route

1. Add or update the shared Zod request/response schemas first.
2. Add backend service logic behind tenant/admin resolution.
3. Add tests for success, validation errors, authorization denial, and tenant
   isolation.
4. Add the route to the appropriate handler group and Terraform integration.
5. Produce a Terraform plan for review before applying route infrastructure.
6. Add frontend UI after the backend route is protected and tested.
