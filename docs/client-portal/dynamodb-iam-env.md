# DynamoDB IAM and Environment Wiring

Phase 14 wires DynamoDB table access into the currently deployed portal handler
group without adding repository code or new business routes. Phase 29 adds a
separate admin Lambda role for the admin client index endpoint.

## Wired Handler Group

Terraform currently exposes the Auth0-protected placeholder route through the
`identityIntake` handler group:

```text
GET /api/_auth-placeholder
```

That Lambda now receives:

```text
CLIENT_PORTAL_TABLE=ClientPortal-{deployment_environment}
PORTAL_HANDLER_GROUP=identityIntake
APP_ENVIRONMENT={deployment_environment}
```

The public health Lambda does not receive `CLIENT_PORTAL_TABLE` and does not
have DynamoDB permissions.

## IAM Scope

The `identityIntake` execution role can access only the portal table and its two
indexes.

Table ARN:

```text
aws_dynamodb_table.client_portal.arn
```

Index ARNs:

```text
aws_dynamodb_table.client_portal.arn/index/GSI1
aws_dynamodb_table.client_portal.arn/index/GSI2
```

Allowed table actions:

```text
dynamodb:BatchGetItem
dynamodb:GetItem
dynamodb:PutItem
dynamodb:Query
dynamodb:UpdateItem
```

Allowed index action:

```text
dynamodb:Query
```

No `dynamodb:*`, S3, or Stripe permissions are granted. Later message phases add
optional SES `SendEmail` permissions only when a verified sender is configured.

## Admin Client Index IAM

Phase 29 wires:

```text
GET /api/admin/clients
```

to the `admin` handler group. That Lambda receives the same
`CLIENT_PORTAL_TABLE`, `PORTAL_HANDLER_GROUP=admin`, and `APP_ENVIRONMENT`
environment variables.

Its IAM policy is read-only for this phase:

```text
dynamodb:GetItem on the table
dynamodb:Query on GSI1/GSI2
```

The handler uses `GetItem` to verify the caller's `INTERNAL_ADMIN` record and
`Query` on `GSI1` to list clients by status. It does not receive
`PutItem`, `UpdateItem`, `TransactWriteItems`, or `Scan`.

## Deferred Handler Groups

The `files`, `messages`, and `billing` TypeScript handler skeletons remain
unwired to Terraform routes in this phase. Their DynamoDB access should be added
when those Lambda resources/routes are introduced so each group can receive only
the actions it needs.
