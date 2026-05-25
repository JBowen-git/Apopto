# Auth0 Setup

Auth0 provides identity and access tokens for the portal. DynamoDB remains the
source of truth for client membership, client lifecycle status, and internal
admin access.

## Terraform Variables

Configure these values per environment:

```hcl
auth0_domain   = "your-tenant.us.auth0.com"
auth0_audience = "https://api.example.com"
```

Do not include `https://` in `auth0_domain`. Terraform builds the issuer as:

```text
https://{auth0_domain}/
```

These identifiers are not secrets, but tracked example files should still use
placeholders. Do not commit real secrets.

## Frontend Environment

The React app reads:

```text
VITE_AUTH0_DOMAIN=<tenant-domain>
VITE_AUTH0_CLIENT_ID=<spa-client-id>
VITE_AUTH0_AUDIENCE=<api-identifier>
VITE_API_BASE_URL=<api-or-site-origin>
```

Restart Vite after changing `VITE_*` values.

The frontend requests normal client scopes by default:

```text
openid
profile
email
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

Admin scopes should be requested only by admin flows:

```text
admin:clients
admin:messages
admin:billing
admin:files
```

## Auth0 API

Create an Auth0 API whose Identifier exactly matches `auth0_audience`. Enable
RBAC and add these permissions:

```text
read:me          Read the current portal user/client context.
write:intake     Create or update the current client intake.
read:client      Read client dashboard/profile context.
write:client     Update editable client profile fields.
read:files       List files and request download URLs.
write:files      Presign uploads, complete uploads, and soft-delete files.
read:messages    List message threads and messages.
write:messages   Create threads and replies.
read:billing     Read invoice metadata and request Stripe portal sessions.
admin:clients    List clients, view detail, update status, create projects.
admin:messages   Reserved for future admin message moderation.
admin:billing    Reserved for future admin billing controls.
admin:files      Reserved for future admin file controls.
```

Normal customer users should not receive admin scopes.

## Application URLs

Configure the Auth0 Single Page Application with local and deployed origins.

Allowed Callback URLs:

```text
http://localhost:5173/callback
https://staging.example.com/callback
https://www.example.com/callback
```

Allowed Logout URLs:

```text
http://localhost:5173
https://staging.example.com
https://www.example.com
```

Allowed Web Origins:

```text
http://localhost:5173
https://staging.example.com
https://www.example.com
```

Allowed CORS Origins should include the same web origins that call the API.
Keep Auth0, API Gateway CORS, and Terraform `cors_allowed_origins` aligned.

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

`GET /api/health` remains public. Portal routes use the JWT authorizer and
Lambda-side scope/tenant checks.

## Backend Authorization

The backend parses Auth0 claims from API Gateway events, checks required scopes,
and resolves tenant context from DynamoDB:

```text
USER#{auth0Sub} -> GSI membership lookup -> CLIENT#{clientId}
```

Admin routes require both:

```text
1. Required Auth0 admin scope.
2. Active DynamoDB INTERNAL_ADMIN item for the token subject.
```

Do not bypass DynamoDB membership checks with client IDs from the frontend.

## Common Problems

- Token audience does not include `auth0_audience`: check the frontend audience
  and Auth0 API Identifier.
- Permissions missing from token: enable RBAC and assign permissions to the
  user/application.
- `/api/me` cannot create a profile: ensure the backend can resolve an email
  claim or user email for the Auth0 subject.
- Browser CORS blocks `Authorization`: explicitly allow the `Authorization`
  header in API CORS and keep CloudFront `/api/*` forwarding configured.
