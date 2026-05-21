# DynamoDB IAM and Environment Wiring

Phase 14 wires DynamoDB table access into the currently deployed portal handler
group without adding repository code or new business routes.

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

No `dynamodb:*`, S3, SES, Stripe, or admin-only permissions are granted in this
phase.

## Deferred Handler Groups

The `files`, `messages`, `billing`, and `admin` TypeScript handler skeletons
remain unwired to Terraform routes in this phase. Their DynamoDB access should
be added when those Lambda resources/routes are introduced so each group can
receive only the actions it needs.
