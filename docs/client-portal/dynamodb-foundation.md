# DynamoDB Foundation

The client portal uses one single-table DynamoDB table per environment. The
Terraform foundation was added in Phase 13, and later backend phases now use
the table for users, memberships, intake, admin, files, messages, billing
metadata, and audit records.

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

Phase 29 uses `GSI1` for the admin client status index:

```text
CLIENT item
  GSI1PK = CLIENT_STATUS#{status}
  GSI1SK = CLIENT#{createdAt}#{clientId}
```

`GET /api/admin/clients?status=lead` queries the matching `GSI1` partition.
When no status filter is supplied, the backend queries each known status
partition and merges the bounded results. It does not scan the table.

## Destroy Protection

The table uses DynamoDB deletion protection.

Production always keeps deletion protection enabled. Non-production also keeps
deletion protection enabled by default.

For an intentional staging teardown, the environment must explicitly opt in:

```hcl
client_portal_table_allow_destroy = true
```

That opt-in is rejected for production.

## Item Model

See `dynamodb-item-model.md` for the full item model, including:

- client profiles
- user profiles
- memberships
- internal admins
- current intake
- projects
- file metadata
- thread/message records
- invoice metadata
- audit events

## Operational Notes

- Do not run normal tenant reads with table scans.
- Client users must resolve tenant access from the Auth0 subject and membership
  records.
- Admin list uses the `CLIENT_STATUS#{status}` GSI partition and bounded
  queries.
- Infrastructure phases that touch this table must produce a Terraform plan
  for human review before apply.
