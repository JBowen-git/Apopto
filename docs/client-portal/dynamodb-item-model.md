# DynamoDB Item Model

The client portal uses a single DynamoDB table per environment:

```text
ClientPortal-{deployment_environment}
```

Keys:

```text
PK string
SK string
GSI1PK string
GSI1SK string
GSI2PK string
GSI2SK string
```

The table uses `PAY_PER_REQUEST`, point-in-time recovery, server-side
encryption, and deletion protection.

## Access Rules

- Auth0 identifies the user; DynamoDB determines tenant membership and status.
- Normal client routes resolve the client through `USER#{auth0Sub}` membership
  index records.
- Client users cannot specify arbitrary `clientId` values for normal access.
- Admin routes require both Auth0 admin scope and an active `INTERNAL_ADMIN`
  item.
- Backend code should use `GetItem`, `BatchGetItem`, and bounded `Query`
  operations for normal paths. Avoid table scans.

## Client Profile

```text
PK = CLIENT#{clientId}
SK = PROFILE#
type = CLIENT
clientId
businessName
status = lead | intake_submitted | qualified | proposal_sent | contract_sent | active | maintenance | archived
primaryContactUserId
createdAt
updatedAt
GSI1PK = CLIENT_STATUS#{status}
GSI1SK = CLIENT#{createdAt}#{clientId}
```

`GSI1` supports admin client list queries by status.

## User Profile

```text
PK = USER#{auth0Sub}
SK = PROFILE#
type = USER
auth0Sub
email
name
createdAt
lastLoginAt
```

## Membership

```text
PK = CLIENT#{clientId}
SK = USER#{auth0Sub}
GSI1PK = USER#{auth0Sub}
GSI1SK = CLIENT#{clientId}
type = MEMBERSHIP
clientId
auth0Sub
role = client_owner | client_member
status = active | invited | removed
createdAt
updatedAt
```

`GSI1` is the normal user-to-client lookup path.

## Internal Admin

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

Internal admin is not represented as a fake client or reserved membership.

## Current Intake

```text
PK = CLIENT#{clientId}
SK = INTAKE#CURRENT
type = INTAKE
clientId
formData
version
createdAt
updatedAt
updatedBy
```

When a lead submits intake, the client status moves to `intake_submitted`.

## Project

```text
PK = CLIENT#{clientId}
SK = PROJECT#{projectId}
type = PROJECT
clientId
projectId
name
status = planning | active | paused | launched | maintenance | archived
description
targetLaunchDate
createdAt
updatedAt
```

## File Metadata

```text
PK = CLIENT#{clientId}
SK = FILE#{createdAt}#{fileId}
GSI1PK = PROJECT#{projectId}
GSI1SK = FILE#{createdAt}#{fileId}
GSI2PK = FILE#{fileId}
GSI2SK = CLIENT#{clientId}
type = FILE
clientId
projectId optional
fileId
bucket
key
originalFilename
safeFilename
mimeType
sizeBytes
category = logo | brand_guidelines | website_copy | images | video | contracts | technical_documents | analytics_exports | screenshots | other
uploadStatus = pending | uploaded | available | blocked | pending_review | clean | quarantined | deleted
scanStatus = pending | clean | infected | failed | skipped | unsupported | unknown
storagePrefix = quarantine | clean | infected
storageKey
cleanStorageKey optional
uploadedBy
createdAt
updatedAt
```

`GSI2` supports file ownership verification by `fileId` without scanning.

## Thread Metadata

```text
PK = CLIENT#{clientId}
SK = THREAD#{updatedAt}#{threadId}
type = THREAD
clientId
threadId
subject
lastMessageAt
lastMessagePreview
createdBy
createdAt
updatedAt
```

## Message

```text
PK = THREAD#{threadId}
SK = MESSAGE#{createdAt}#{messageId}
GSI1PK = CLIENT#{clientId}
GSI1SK = MESSAGE#{createdAt}#{messageId}
type = MESSAGE
clientId
threadId
messageId
body
senderUserId
senderRole
visibility = client_and_admin | internal_only
emailNotificationStatus = not_sent | sent | failed
createdAt
```

Thread ownership is verified before listing or writing messages.

## Invoice

```text
PK = CLIENT#{clientId}
SK = INVOICE#{dueDate}#{invoiceId}
type = INVOICE
clientId
invoiceId
provider = stripe
stripeCustomerId optional
stripeInvoiceId optional
status = draft | open | paid | void | uncollectible | past_due
amountDue
currency
dueDate
createdAt
updatedAt
```

The portal stores invoice metadata only. It does not store payment method or
card data.

## Audit Event

```text
PK = CLIENT#{clientId}
SK = AUDIT#{createdAt}#{eventId}
type = AUDIT
clientId
eventId
actorUserId
action
entityType
entityId
metadata
createdAt
```

Audit events are written for sensitive changes such as intake updates, profile
updates, file lifecycle changes, messages, and admin status/project actions.
