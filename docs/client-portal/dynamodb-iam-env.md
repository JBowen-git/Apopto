# DynamoDB IAM and Environment Wiring

Portal Lambda handler groups receive `CLIENT_PORTAL_TABLE` only when they need
DynamoDB access. The public health Lambda does not receive table access.

## Environment Variables

Common portal handler variables:

```text
CLIENT_PORTAL_TABLE=ClientPortal-{deployment_environment}
PORTAL_HANDLER_GROUP={identityIntake|admin|files|messages|billing}
APP_ENVIRONMENT={deployment_environment}
```

Additional group-specific variables include:

```text
UPLOAD_BUCKET
MAX_UPLOAD_BYTES
SES_FROM_EMAIL
SES_NOTIFICATION_TO_EMAIL
PORTAL_BASE_URL
STRIPE_SECRET_KEY_PARAMETER_NAME
```

Optional integration configuration should be absent when the integration is
disabled. Stripe secret values live in manually managed SSM SecureString
parameters and are fetched by the billing Lambda at runtime.

## Handler Groups

```text
identityIntake  user bootstrap, dashboard, intake, profile updates
admin           client list/detail/status/project actions
files           file metadata, upload completion, download/soft delete
messages        thread/message records and optional notification status
billing         invoice metadata and optional Stripe portal session
fileScanResult  GuardDuty scan result updates and audit events
```

## IAM Scope

Policies should grant only the DynamoDB actions each handler group needs.
Common allowed actions include narrowly scoped combinations of:

```text
dynamodb:BatchGetItem
dynamodb:GetItem
dynamodb:PutItem
dynamodb:Query
dynamodb:UpdateItem
dynamodb:TransactWriteItems
```

Index access is limited to:

```text
aws_dynamodb_table.client_portal.arn/index/GSI1
aws_dynamodb_table.client_portal.arn/index/GSI2
```

Do not grant broad `dynamodb:*` for portal handlers.

## Access Patterns

- `identityIntake` resolves user membership, bootstraps first client context,
  reads dashboard slices, and writes intake/profile/audit records.
- `admin` verifies `INTERNAL_ADMIN`, queries clients by status, reads bounded
  detail, changes client status, creates projects, and writes audit records.
- `files` verifies ownership through metadata keys/indexes and writes file/audit
  lifecycle updates.
- `messages` verifies thread/client ownership and writes thread/message/audit
  records.
- `billing` reads invoice metadata and verifies tenant access before returning
  Stripe portal sessions.
- `fileScanResult` updates file metadata after GuardDuty scan events.

Normal request paths should use `GetItem`, bounded `Query`, `BatchGetItem`, or
targeted writes. Avoid table scans.

## Review Rule

IAM and environment changes are infrastructure-sensitive. Produce a Terraform
plan for review before apply and check for unexpected permission broadening.
