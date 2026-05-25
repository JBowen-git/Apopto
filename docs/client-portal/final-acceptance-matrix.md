# Final Integration And Manual Acceptance Matrix

Phase 50 is the final MVP integration gate. It does not add feature scope and
does not apply Terraform. Infrastructure changes must still stop at a reviewed
Terraform plan before apply.

## Scope

Acceptance covers:

- new lead bootstrap
- intake submission
- admin status change
- active client file upload and scanned download path
- messages
- billing fallback without Stripe configured
- unauthorized and cross-tenant access denial

## Preflight

Before manual staging acceptance:

1. Run the repo validation command:

   ```bash
   npm run validate:repo
   ```

2. Package artifacts for the target environment:

   ```bash
   APP_ENVIRONMENT=staging \
   PRERENDER_SITE_ORIGIN=https://example.com \
   bash scripts/cicd/package_release_artifacts.sh
   ```

3. Produce a Terraform plan for review:

   ```bash
   terraform -chdir=Terraform/App plan \
     -var-file=environments/staging.tfvars \
     -out=staging-final-acceptance.tfplan
   ```

4. Apply only after explicit approval.
5. Confirm Auth0 callback/logout/web origins and API audience match staging.
6. Seed an internal admin with `Backend`'s admin seed script.
7. Use test users and test files only. Do not upload real secrets, production
   client data, or payment/card data.

## Automated Evidence

The automated test suite covers the critical backend and frontend behaviors
without real AWS, Auth0, Stripe, or SES credentials.

| Acceptance area | Automated coverage |
| --- | --- |
| New lead bootstrap | `Backend/test/meHandler.test.ts`, `Backend/test/dashboardHandler.test.ts`, `Backend/test/featureFlags.test.ts` |
| Intake lead to submitted | `Backend/test/intakeHandler.test.ts`, shared intake schema tests |
| Admin scope plus `INTERNAL_ADMIN` | `Backend/test/adminAuth.test.ts`, `Backend/test/adminClientList.test.ts`, `Backend/test/adminClientManage.test.ts` |
| Active file upload and ownership | `Backend/test/filesHandler.test.ts`, `Backend/test/fileSafety.test.ts`, `Backend/test/fileMetadata.test.ts` |
| GuardDuty scan lifecycle | `Backend/test/guardDutyScan.test.ts` |
| Messages and tenant isolation | `Backend/test/messagesHandler.test.ts`, `Backend/test/messageNotifications.test.ts` |
| Billing fallback and Stripe portal scaffold | `Backend/test/billingHandler.test.ts` |
| Unauthorized/forbidden errors | `Backend/test/authClaims.test.ts`, `Backend/test/response.test.ts`, `Frontend/src/api/client.test.ts` |
| Frontend route gates and lifecycle modules | `Frontend/src/components/routing/ProtectedRoute.test.tsx`, `Frontend/src/components/dashboard/DashboardLifecycleModules.test.tsx` |

## Manual Acceptance Matrix

### 1. New Lead Bootstrap

Setup:

- Use a new Auth0 test user with normal client scopes.
- Ensure no existing DynamoDB `USER#{auth0Sub}` membership exists for that user.

Steps:

1. Visit `/account` or click the public login entry point.
2. Complete Auth0 login.
3. Land on `/dashboard`.
4. Confirm the dashboard shows the new business/client context.
5. Confirm the backend created:
   - `USER#{auth0Sub} / PROFILE#`
   - `CLIENT#{clientId} / PROFILE#` with `status=lead`
   - `CLIENT#{clientId} / USER#{auth0Sub}` membership with `role=client_owner`

Pass criteria:

- User reaches `/dashboard`.
- Client status is `lead`.
- Intake editing is available.
- Files, billing, projects, and admin modules are not available to the lead
  client.

Rollback:

- Remove the test user/client/membership records from the staging table if the
  test data should not remain.

### 2. Intake Submission

Setup:

- Use the new lead test user.

Steps:

1. Open `/intake`.
2. Fill all required fields.
3. Confirm the no-secrets warning and terms acknowledgements.
4. Save the intake.
5. Return to `/dashboard`.

Pass criteria:

- `PUT /api/intake` succeeds.
- `INTAKE#CURRENT` is created or updated.
- Intake version is set/incremented.
- Lead client status changes to `intake_submitted`.
- An audit event is written.
- Dashboard next steps reflect submitted intake.

Rollback:

- Admin can move the test client back to `lead`, or the test client records can
  be removed from staging after review.

### 3. Admin Status Change

Setup:

- Use an Auth0 test admin with `admin:clients`.
- Seed an active `INTERNAL_ADMIN` item for the admin subject.

Steps:

1. Log in as the admin.
2. Open `/admin/clients`.
3. Filter or find the test client.
4. Open `/admin/clients/{clientId}`.
5. Change status to `active`.
6. Optionally create a test project.

Pass criteria:

- Non-admin users cannot access admin pages or API data.
- Admin client list uses status-indexed results.
- Status update succeeds.
- Client status GSI fields are updated.
- Audit event records the admin action.
- Test project appears in client detail/dashboard slices.

Rollback:

- Change the test client status back to its previous value.
- Delete or archive only test projects if cleanup is needed.

### 4. Active File Upload

Setup:

- Test client status is `active`.
- Use a harmless test image or text/PDF file.

Steps:

1. Open `/files`.
2. Confirm no-secrets and allowed file guidance is visible.
3. Select a valid category and file.
4. Upload the file.
5. Confirm browser PUT goes directly to S3 using a presigned URL.
6. Confirm `POST /api/files/{fileId}/complete` succeeds.
7. Wait for GuardDuty scan result.
8. Confirm the file becomes downloadable only after clean scan status.

Pass criteria:

- Lambda never receives file bytes.
- New file metadata starts in `quarantine/`.
- Blocked extensions are rejected before presign.
- Cross-client file IDs are rejected.
- Clean scan transitions to `scanStatus=clean` and `uploadStatus=available`.
- Download URL is short-lived and available only for clean files.
- Deleted/quarantined/blocked files do not get download URLs.

Rollback:

- Soft-delete the test file through the UI/API.
- If needed, remove the test object from staging S3 after verifying metadata.

### 5. Messages

Setup:

- Test client status allows messages: `intake_submitted`, `qualified`,
  `proposal_sent`, `contract_sent`, `active`, or `maintenance`.

Steps:

1. Open `/messages`.
2. Create a new thread.
3. Open the thread.
4. Add a reply.
5. Confirm the thread list updates with the latest preview/time.

Pass criteria:

- Thread metadata is stored under the client partition.
- Messages are stored under the thread partition.
- Thread ownership is verified before read/write.
- Cross-client thread IDs are rejected.
- Message content renders as plain text or sanitized markdown, never raw HTML.
- If SES is not configured, notification status remains `not_sent`.

Rollback:

- Leave staging messages as test audit trail, or delete test records manually if
  staging data cleanup is required.

### 6. Billing Fallback

Setup:

- Leave `STRIPE_SECRET_KEY` unset for staging fallback validation.
- Add test invoice metadata if needed.

Steps:

1. Open `/billing`.
2. Confirm invoice metadata renders.
3. Click the Stripe portal action.

Pass criteria:

- `GET /api/billing` returns invoice metadata for the authenticated client only.
- `POST /api/billing/stripe-portal-session` returns a clear `501` fallback when
  Stripe is not configured.
- UI shows a clear unconfigured message.
- No card/payment method data is stored in the app.

Rollback:

- Remove any test invoice metadata from staging if needed.

### 7. Unauthorized And Cross-Tenant Access

Setup:

- Use one unauthenticated browser session.
- Use two normal test users with separate clients.
- Use one non-admin normal user.

Steps:

1. Request protected portal routes while logged out.
2. Request API routes with a missing/expired token.
3. Use a normal user to request admin endpoints.
4. Attempt cross-client file, thread, invoice, or admin detail access using
   another client's IDs.

Pass criteria:

- Logged-out portal routes require login.
- API routes return consistent `401`/`403` JSON errors with request IDs where
  available.
- Normal users cannot access admin endpoints.
- Admin scope alone is insufficient without an active `INTERNAL_ADMIN` item.
- Client users cannot access another client's files, messages, invoices, or
  details.

Rollback:

- No rollback needed except removing test records.

## Cleanup Review

No code or Terraform placeholder was removed in Phase 50 unless it was confirmed
unused. The following remain intentional:

- Legacy `.NET` backend project and zip packaging remain rollback artifacts.
- `auth-placeholder` Terraform names remain live resource identifiers for the
  identity/intake Lambda integration path and should not be renamed casually.
- UI placeholder imagery remains part of the public marketing design.
- `not_implemented` router helper remains available for safe future route
  placeholders.

## Deferred Work

- Real production Stripe configuration and customer portal validation.
- SES production access, verified sending domain, bounce/complaint monitoring.
- WAF/rate-limit adoption for the current flat-rate CloudFront Web ACL.
- Paid CloudWatch alarms/dashboards after notification targets are chosen.
- End-to-end browser automation against deployed staging.
- Formal staging data cleanup tooling for test clients and uploaded objects.

## Rollback Notes

- Backend Lambda rollback artifact:
  `Backend/artifacts/{environment}-backend.zip`
- TypeScript portal API artifact:
  `Backend/artifacts/{environment}-portal-api.zip`
- If a deployment fails after Lambda artifact changes, review the Terraform
  plan/state and use the previous known-good artifact or GitHub workflow run.
- Do not remove DynamoDB tables or S3 buckets during rollback unless a reviewed
  teardown plan explicitly calls for it.
