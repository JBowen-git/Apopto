# Client Portal Troubleshooting

Use this guide when local development, authentication, CI, deployment, or portal
runtime behavior does not match expectations.

## Local Auth0 Login Shows a Placeholder

Check `Frontend/.env` or the shell environment used by Vite:

```text
VITE_AUTH0_DOMAIN=<tenant-domain>
VITE_AUTH0_CLIENT_ID=<spa-client-id>
VITE_AUTH0_AUDIENCE=<api-identifier>
VITE_API_BASE_URL=<api-or-site-origin>
```

Restart the Vite dev server after changing `VITE_*` values.

## `/api/me` Returns HTML Instead of JSON

This usually means the frontend is calling the local Vite dev server instead of
the deployed API, or CloudFront is sending `/api/*` to the website origin.

Check:

- `VITE_API_BASE_URL` points at the API origin or deployed site origin that
  routes `/api/*` to API Gateway.
- CloudFront has the `/api/*` ordered cache behavior above the default S3
  behavior.
- The API behavior forwards `Authorization` and CORS request headers.

## API Returns 401 or 403

401 usually means the token is missing, expired, malformed, or has the wrong
issuer/audience. 403 usually means authorization failed after the token was
accepted.

Check:

- Auth0 API Identifier exactly matches `auth0_audience`.
- The frontend requests the expected audience.
- RBAC is enabled for the Auth0 API.
- Required permissions are assigned to the user/application.
- Admin requests have both the Auth0 admin scope and an active DynamoDB
  `INTERNAL_ADMIN` item.

For bootstrap profile creation, the access token or user profile data must make
an email address available to the backend.

## CORS Blocks Authorization Header

Browsers require `Authorization` to be explicitly allowed. `*` is not enough
for credentialed or authorization-bearing API requests.

Check:

- API Gateway CORS allowed headers include `Authorization`.
- Allowed origins include the exact local or deployed frontend origin.
- CloudFront forwards preflight headers for `/api/*`.
- The browser is calling the API origin configured in `VITE_API_BASE_URL`.

## Intake Save Fails

Check that the request body matches the shared Zod schema:

- `acceptedNoSecretsWarning` must be `true`.
- `acceptedTerms` must be `true`.
- Required business, contact, industry, description, goals, audience, design,
  budget, timeline, and feature fields must be present.
- URL fields can be blank, but non-blank values must be valid URLs.

## Upload Presign Fails

Check:

- The client status is `active` or `maintenance`.
- File extension is not blocked.
- File size is below `MAX_UPLOAD_BYTES`.
- `UPLOAD_BUCKET` is configured on the files Lambda.
- The files Lambda has scoped S3 permissions for the upload bucket.

Uploads must go directly from the browser to S3 using the presigned URL. Lambda
must not receive file bytes.

## Uploaded File Is Not Downloadable

Files are not downloadable until the scan workflow marks them clean.

Check:

- The object was uploaded under `quarantine/`.
- GuardDuty Malware Protection is enabled for the upload bucket/prefix.
- EventBridge delivered the scan result to the scan-result Lambda.
- DynamoDB file metadata has `scanStatus=clean` and `uploadStatus=available`.
- The download route verifies the file belongs to the authenticated client's
  DynamoDB record.

Threats, failed scans, unsupported scans, deleted files, and quarantined files
must not receive download URLs.

## Stripe Portal Button Says Not Configured

That is expected when `STRIPE_SECRET_KEY` is absent. Billing metadata can still
render. Add Stripe configuration later through a secure environment mechanism;
do not commit Stripe keys.

## SES Messages Do Not Send

Message creation still works without SES. Email sends only when
`SES_FROM_EMAIL` is set. In SES sandbox mode, both sender and recipient
addresses may need verification.

## Terraform Plan Has Unexpected Destroys

Stop and review before apply.

Common safe churn:

- Hashed frontend asset object creates/destroys after a new build.
- Site renderer build ID object replacement.

High-risk changes that need careful review:

- DynamoDB table replacement or deletion protection changes.
- Upload bucket replacement or policy changes.
- CloudFront distribution updates, especially Web ACL behavior.
- IAM permissions broadening.
- GuardDuty Malware Protection replacement.

Infrastructure phases must produce a Terraform plan for review and must not
apply without explicit approval.

## CloudFront Flat-Rate Plan Errors

The flat-rate plan can reject unsupported distribution features and Web ACL
removal/replacement. If CloudFront returns pricing-plan errors, review
`cloudfront-api-hardening.md` and `security.md` before changing policies.

## S3 CORS Rejects PATCH

S3 bucket CORS does not support `PATCH`. Keep PATCH out of S3 bucket CORS
allowed methods. PATCH can still be used on API Gateway routes.

## CloudWatch Alarm Access Denied

Metric alarms are optional paid resources and are disabled by default. If an
apply tries to create alarms and fails with `cloudwatch:PutMetricAlarm`, either
grant the deploy role the required CloudWatch permissions or leave
`cloudwatch_alarms_enabled=false` until alarm design is revisited.

## CI Fails During Tool Install

Run locally:

```bash
npm run validate:repo
```

The validation command runs npm installs, frontend build/test, backend
build/test, artifact packaging, and Terraform fmt/validate. It does not need
real Auth0, Stripe, or SES secrets.

If a sandboxed local run fails while executing native build tools such as
`esbuild`, rerun in a normal shell.
