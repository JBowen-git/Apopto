# Internal Admin Seeding

Phase 28 adds the backend-only internal admin foundation. It does not add admin
UI or admin business routes.

## Data Model

Internal admins are represented by a dedicated item in the authenticated user's
real user partition:

```text
PK = USER#{auth0Sub}
SK = INTERNAL_ADMIN#
type = INTERNAL_ADMIN
auth0Sub
status = active | disabled
createdAt
updatedAt
createdBy
updatedBy optional
email optional
name optional
notes optional
```

Do not create a fake client, reserved client, or client membership to represent
internal admin access. Client memberships remain client-scoped only.

## Authorization Rule

Admin access requires both checks to pass:

```text
1. The Auth0 access token contains the required admin scope.
2. DynamoDB has an active INTERNAL_ADMIN item for the token subject.
```

The backend `requireAdmin` utility checks the token scopes first, then reads:

```text
PK = USER#{claims.sub}
SK = INTERNAL_ADMIN#
```

Disabled or missing admin items return `403 admin_access_denied`.

## Seed Script

Use the manual seed script after the Auth0 user exists and you know the Auth0
subject claim, such as `auth0|abc123`.

Dry run:

```bash
AWS_PROFILE=apopto \
AWS_REGION=us-east-2 \
CLIENT_PORTAL_TABLE=ClientPortal-staging \
ADMIN_AUTH0_SUB='auth0|replace-me' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_NAME='Admin User' \
npm --prefix Backend run seed:internal-admin -- --dry-run
```

Create the item:

```bash
AWS_PROFILE=apopto \
AWS_REGION=us-east-2 \
CLIENT_PORTAL_TABLE=ClientPortal-staging \
ADMIN_AUTH0_SUB='auth0|replace-me' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_NAME='Admin User' \
CREATED_BY='manual_seed' \
npm --prefix Backend run seed:internal-admin
```

The script uses a conditional put:

```text
attribute_not_exists(PK) AND attribute_not_exists(SK)
```

If the admin item already exists, the script fails instead of silently
overwriting access.

## Auth0 Requirements

The Auth0 API still needs RBAC enabled and the relevant admin permissions
assigned to the internal user:

```text
admin:clients
admin:messages
admin:billing
admin:files
```

Do not request these scopes in the normal customer portal login flow. Admin
flows should request only the scopes they need, and the backend still relies on
the DynamoDB `INTERNAL_ADMIN` item before allowing admin access.
