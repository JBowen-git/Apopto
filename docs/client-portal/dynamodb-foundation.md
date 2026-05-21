# DynamoDB Foundation

Phase 13 adds the Terraform foundation for the client portal single-table data
model without wiring application handlers to it yet.

## Table

Terraform creates one DynamoDB table per environment:

```text
ClientPortal-{deployment_environment}
```

For staging, this resolves to:

```text
ClientPortal-staging
```

The table uses:

```text
PK string
SK string
billing mode PAY_PER_REQUEST
point-in-time recovery enabled
server-side encryption enabled
```

## Indexes

The table includes two global secondary indexes for the future portal access
patterns:

```text
GSI1
  GSI1PK string
  GSI1SK string
  projection ALL

GSI2
  GSI2PK string
  GSI2SK string
  projection ALL
```

## Destroy Protection

The table uses DynamoDB deletion protection.

Production always keeps deletion protection enabled. Non-production also keeps
deletion protection enabled by default.

For an intentional staging teardown, the environment must explicitly opt in:

```hcl
client_portal_table_allow_destroy = true
```

That opt-in is rejected for production.

## Deferred

Phase 13 does not add Lambda permissions, DynamoDB data access code, portal
routes, seed data, or application reads/writes.
