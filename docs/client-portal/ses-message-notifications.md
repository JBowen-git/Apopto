# SES Message Notification Scaffold

Phase 40 adds optional outbound email for new client portal messages. Message
creation still works when SES is not configured.

## Runtime Switch

The messages Lambda sends notification email only when this environment variable
is present and non-empty:

```text
SES_FROM_EMAIL
```

When `SES_FROM_EMAIL` is absent, the backend does not call SES and leaves the new
message `emailNotificationStatus` as `not_sent`.

When `SES_FROM_EMAIL` is configured, the backend sends one simple text email for
new threads and replies. The email includes:

- the client business name
- the thread subject
- a short message preview
- a portal link to `/messages/{threadId}`
- a note that reply-by-email is not enabled

After the send attempt, the backend updates the message record to:

```text
emailNotificationStatus = sent | failed
```

The notification attempt does not receive or store file bytes, payment data, or
reply-by-email content.

## Environment Variables

```text
SES_FROM_EMAIL=portal@example.com
SES_NOTIFICATION_TO_EMAIL=notifications@example.com
PORTAL_BASE_URL=https://example.com
```

`SES_NOTIFICATION_TO_EMAIL` is optional. If omitted, Terraform and the backend
default it to `SES_FROM_EMAIL`, which is useful while the AWS account is still in
the SES sandbox.

`PORTAL_BASE_URL` is set by Terraform from `frontend_site_origin` when that value
is configured. Otherwise it falls back to the CloudFront distribution domain.

## Terraform IAM

Terraform adds SES permissions only when `ses_from_email` is non-empty.

The messages Lambda receives:

```text
ses:SendEmail
```

The policy is constrained with SES condition keys:

```text
ses:FromAddress = var.ses_from_email
ses:Recipients  = var.ses_notification_to_email or var.ses_from_email
```

No SES permission is granted when notifications are disabled.

## SES Sandbox

New SES accounts usually start in sandbox mode. In sandbox mode:

- the sender identity must be verified
- every recipient address must also be verified
- sending limits are lower

For staging, verify `SES_FROM_EMAIL` and either set
`SES_NOTIFICATION_TO_EMAIL` to the same verified address or verify the separate
recipient address.

## Production Access

Before production use:

1. Verify the sending domain or sender identity in SES.
2. Configure DKIM for the sending domain.
3. Add SPF/DMARC records if the domain does not already have them.
4. Request SES production access for the AWS region used by the app.
5. Set `ses_from_email` and `ses_notification_to_email` in the production tfvars.
6. Monitor bounces and complaints before increasing send volume.

Reply-by-email is intentionally out of scope for this phase.
