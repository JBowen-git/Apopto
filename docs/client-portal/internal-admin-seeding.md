# Internal Admin Seeding

Internal admin access is intentionally two-factor at the authorization layer:
Auth0 must grant an admin scope, and DynamoDB must contain an active
`INTERNAL_ADMIN` item for the real Auth0 user subject.

## Data Model

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

Do not create a fake client, reserved client, or client membership for internal
admin access. Client memberships remain client-scoped only.

## Authorization Rule

Admin routes require both:

```text
1. The Auth0 access token contains the required admin scope.
2. DynamoDB has an active INTERNAL_ADMIN item for the token subject.
```

The backend checks:

```text
PK = USER#{claims.sub}
SK = INTERNAL_ADMIN#
```

Missing or disabled admin items return `403 admin_access_denied`.

## Auth0 Requirements

Create and assign only the admin scopes the user needs:

```text
admin:clients
admin:messages
admin:billing
admin:files
```

Normal customer login should not request admin scopes. Admin frontend calls can
request admin scopes when needed, but the backend still requires the DynamoDB
admin item.

## Seed Script

Run the seed script after the Auth0 user exists and the Auth0 subject is known,
for example `auth0|abc123`.

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

Use placeholders in docs and tickets. Do not paste real user IDs, emails, or
access tokens into committed files.

The script uses a conditional put:

```text
attribute_not_exists(PK) AND attribute_not_exists(SK)
```

If the item already exists, the script fails instead of silently overwriting
access.

## Verification

After seeding:

1. Log in as the internal user.
2. Confirm the token has the needed admin scope.
3. Visit `/admin/clients`.
4. If access is denied, check both Auth0 permissions and the DynamoDB
   `INTERNAL_ADMIN` item.

## Revocation

Disable admin access by updating the DynamoDB item to:

```text
status = disabled
```

Also remove Auth0 admin permissions from the user. Both should be removed for a
clean offboarding path.
