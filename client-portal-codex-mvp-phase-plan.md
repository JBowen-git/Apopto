# Client Portal MVP Foundation — Codex Phase Plan

**Audience:** Codex / implementation agent  
**Primary human owner:** Business owner/developer  
**Updated:** 2026-05-20  
**Purpose:** Build the client portal MVP foundation in very small, reviewable implementation phases so Codex never has to perform a giant rewrite.

---

## 0. How Codex Should Use This Document

Codex must treat this document as a phased implementation contract.

Do **not** implement the full portal in one pass. Implement exactly one phase per Codex run unless the human explicitly asks for more. Each phase has a copy-paste prompt written for Codex. Use that prompt as the active task and use the rest of this file as reference.

For every phase, Codex must:

1. Inspect the existing repository before changing files.
2. Preserve the current repo folder names: **`Frontend`**, **`Backend`**, and **`Terraform`**.
3. Preserve the existing visual styling system and marketing pages.
4. Keep Terraform as the only infrastructure source of truth. Do **not** introduce CDK.
5. Implement only the requested phase.
6. Avoid speculative features from later phases.
7. Run the validation commands that exist in the repo.
8. Explain any validation command that cannot be run.
9. End with a clear summary:
   - files changed,
   - commands run,
   - tests passing/failing,
   - assumptions made,
   - anything deferred,
   - whether Terraform plan review is needed.

When uncertain, make the smallest safe implementation and document the assumption. Do not rename folders, restructure the repo, or replace deployment tooling unless the current phase explicitly asks for it.

---

## 1. Current Repo Assumptions Codex Must Respect

These assumptions come from the current plan review and should be verified in Phase 1 before implementation work begins.

```text
Frontend/   React/Vite app, mostly JS/JSX today
Backend/    Current .NET Lambda health API
Terraform/  Existing CloudFront, S3 static hosting, HTTP API Gateway, Lambda infrastructure
```

Important repo-specific rules:

- Do **not** casually rename `Frontend`, `Backend`, or `Terraform` to lowercase folders.
- Existing marketing pages must continue building after every frontend phase.
- The repo currently has CI/deployment scripts that package frontend and .NET backend artifacts.
- `scripts/cicd/package_release_artifacts.sh` is expected to assume `dotnet publish`; Phase 2 and Phase 8 deal with this carefully.
- API routes must stay under `/api/*` because CloudFront already routes `/api/*` to API Gateway.
- Terraform plans must be reviewed by a human before apply for all infrastructure phases.
- Be extra careful with CloudFront plan drift, including distribution/pricing-class changes that may be unrelated to the intended phase.

---

## 2. Target Architecture

The application is a client portal for a business that builds bespoke React + AWS websites.

```text
React + TypeScript frontend
  ↓ Auth0 access token
CloudFront
  ↓ /api/* behavior
HTTP API Gateway with JWT authorizer
  ↓ validated JWT claims
TypeScript Node.js Lambda handlers
  ↓
DynamoDB single-table portal source of truth
S3 private upload bucket for file bytes
SES notification scaffold
Stripe billing portal scaffold
```

Core user flow:

```text
New customer signs up/logs in with Auth0
  ↓
/api/me bootstraps USER, CLIENT, MEMBERSHIP if needed
  ↓
Customer completes intake form
  ↓
Lead dashboard shows intake/profile/next steps
  ↓
Admin reviews and changes lifecycle status
  ↓
Active client sees project files, messages, billing, and project status
  ↓
Maintenance/archived dashboards expose appropriate read-only or support features
```

Auth0 is identity only. DynamoDB is the source of truth for client status, intake data, memberships, file metadata, messages, project records, invoice metadata, and audit events.

---

## 3. Non-Negotiable Guardrails

### 3.1 Infrastructure

- Keep Terraform.
- Do not introduce AWS CDK.
- Keep CloudFront, S3 static hosting, and HTTP API Gateway.
- All API routes must be reachable under `/api/*`.
- Use environment-aware names such as `ClientPortal-{env}` and `client-portal-uploads-{env}-{account}`.
- Production data resources must be protected from accidental destroy.
- Dev/staging destructive behavior requires an explicit opt-in variable.

### 3.2 Terraform plan review

For phases touching Terraform:

```text
terraform fmt -check
terraform validate
terraform plan
```

Codex must **not** run `terraform apply` unless the human explicitly instructs it after reviewing the plan.

Human plan review is mandatory for:

- Lambda runtime/artifact replacement,
- API Gateway JWT authorizer,
- CloudFront `/api/*` cache/header behavior,
- DynamoDB table creation or data-resource lifecycle changes,
- S3 upload bucket creation,
- IAM permission changes,
- SES permissions,
- CloudWatch alarms,
- WAF/CloudFront changes,
- final deployment gate.

### 3.3 Authentication and authorization

- Use Auth0 for login and identity.
- Do not store business/application data in Auth0 metadata except tiny pointers if absolutely necessary.
- Every API route except explicit health/public routes must require JWT auth.
- API Gateway JWT authorization is not enough by itself. Lambda must also perform authorization against DynamoDB membership/admin records.
- Never trust a normal client user's `clientId` from request body, URL, local storage, or query string.
- Resolve normal client access from:

```text
JWT sub → USER profile → active MEMBERSHIP → CLIENT profile
```

- Admin access requires both:
  - Auth0 admin scope, and
  - active DynamoDB `INTERNAL_ADMIN` item.

Do **not** model admins as members of a fake client.

### 3.4 Data and tenancy

- DynamoDB is the portal source of truth.
- Use a single main DynamoDB table unless the existing repo has a compelling reason not to.
- Prefer item prefixes and GSIs over many tables.
- Avoid scans for normal app routes.
- `/api/dashboard` must not blindly return the entire client partition. It must retrieve deliberate, bounded slices.

### 3.5 Files

- Store file bytes in S3 only.
- Store file metadata in DynamoDB.
- Lambda must never receive file bytes for normal uploads.
- Browser uploads must use short-lived presigned S3 URLs.
- The S3 bucket must be private, encrypted, versioned, block public access, and have CORS configured for browser upload.
- Dangerous executable/script extensions must be blocked for client users.
- Uploaded files are untrusted until verified and, later, scanned.

### 3.6 Frontend

- Convert to TypeScript progressively and safely.
- Keep the existing visual system.
- Do not add Tailwind unless the repo already uses it.
- Protected routes should load as SPA routes after Auth0 state is known.
- Public marketing pages may remain static/prerendered if the repo already supports that.
- Existing marketing pages must continue building after every frontend phase.
- Refreshing `/dashboard`, `/intake`, `/files`, `/messages`, `/billing`, or `/admin/*` must serve the SPA entry point, not 404.

### 3.7 Billing and messages

- Do not store payment card data.
- Use Stripe-hosted billing/customer portal when billing is added.
- Portal messages are the canonical record.
- Email is notification/delivery, not the canonical conversation store.
- Reply-by-email is out of MVP scope.

---

## 4. Global Resource References

Use official docs when implementing or verifying behavior:

- Auth0 React SDK: https://auth0.com/docs/libraries/auth0-react
- Auth0 API RBAC: https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis
- Auth0 API permissions: https://auth0.com/docs/get-started/apis/add-api-permissions
- AWS HTTP API JWT authorizers: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS Lambda TypeScript: https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html
- AWS Lambda TypeScript package with esbuild: https://docs.aws.amazon.com/lambda/latest/dg/typescript-package.html
- Terraform `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- DynamoDB table design best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-table-design.html
- DynamoDB point-in-time recovery: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- S3 presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- S3 CORS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html
- S3 object ownership / ACLs disabled: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- CloudFront Authorization header forwarding: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- AWS WAF rate-based rules: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
- GuardDuty Malware Protection for S3: https://docs.aws.amazon.com/guardduty/latest/ug/gdu-malware-protection-s3.html
- SES sandbox / production access: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Stripe customer portal sessions: https://docs.stripe.com/api/customer_portal/sessions
- Stripe customer portal integration: https://docs.stripe.com/customer-management/integrate-customer-portal

---

## 5. Phase Map

This version expands the previous plan into **50 granular phases**. Phase 20 from the earlier version is no longer a large combined phase; messages, SES, billing, observability, WAF, CI, and docs are mandatory standalone phases.

| Phase | Name | Primary Output |
|---:|---|---|
| 1 | Repository Discovery and Baseline Inventory | Create an accurate, written inventory of the existing repo before any portal implementation begins. |
| 2 | Deployment Script and Artifact Packaging Audit | Understand exactly how the repo packages and deploys artifacts before the backend runtime migration. |
| 3 | Workspace and Package Boundary Preparation | Prepare TypeScript package boundaries without restructuring the repo or breaking existing builds. |
| 4 | Shared Core TypeScript Types and Status Enums | Create the first real shared types: lifecycle statuses, roles, feature flags, and common API envelopes. |
| 5 | Shared Intake, Profile, and Request Schemas | Add the full intake/profile/request schema set used by frontend forms and backend validation. |
| 6 | Shared Schema Integration Smoke Test | Prove the frontend and backend can import shared schemas before large feature work begins. |
| 7 | Backend TypeScript Scaffold | Introduce TypeScript backend source structure while leaving the deployed .NET Lambda untouched. |
| 8 | Backend Lambda Packaging Script Migration | Update artifact packaging so a TypeScript/Node Lambda zip can be produced repeatably, without changing the deployed runtime yet. |
| 9 | Minimal Node `/api/health` Lambda Replacement | Safely replace or shadow the .NET health Lambda with a Node/TypeScript health Lambda. |
| 10 | API Routing Strategy and Handler Group Skeletons | Create a clear routing strategy for grouped TypeScript Lambda handlers without implementing feature logic. |
| 11 | Auth0 Terraform Variables and API Gateway JWT Authorizer | Add Auth0 JWT validation to API Gateway without building portal business logic yet. |
| 12 | CloudFront `/api/*` Authorization and No-Cache Hardening | Ensure authenticated API traffic is safely forwarded through CloudFront without private-response caching bugs. |
| 13 | DynamoDB Table Terraform Foundation | Create the portal source-of-truth table with indexes and production data protections. |
| 14 | DynamoDB IAM and Environment Wiring | Give the appropriate Lambda handler group least-privilege access to the portal table and expose table name through env vars. |
| 15 | Backend DynamoDB Key Builders and Repository Utilities | Create typed DynamoDB access helpers and item builders without implementing API behavior. |
| 16 | Backend Auth Claim Parsing and Response Utilities | Create backend utilities for reading API Gateway JWT claims and returning consistent responses/errors. |
| 17 | Tenant Resolver and Feature Flag Engine | Resolve authenticated users to client context through DynamoDB membership and generate lifecycle feature flags. |
| 18 | `/api/me` Bootstrap Endpoint | Implement the first real authenticated portal route: user/client/membership bootstrap. |
| 19 | Frontend TypeScript Conversion Foundation | Start the frontend TypeScript migration safely without changing portal behavior yet. |
| 20 | Frontend Auth0 Provider and Callback Route | Add Auth0 login plumbing to the frontend without building protected portal screens yet. |
| 21 | Frontend Protected Route and Tokenized API Client | Create the frontend primitives needed to call protected API routes. |
| 22 | Frontend `/dashboard` Shell Calling `/api/me` | Connect the frontend to the first authenticated backend endpoint and show a minimal dashboard shell. |
| 23 | Intake Backend API | Implement intake read/write and profile update endpoints with validation and audit events. |
| 24 | Intake Frontend Form Foundation | Build the intake form UI skeleton and client-side validation without trying to perfect every UX detail. |
| 25 | Intake Summary and Profile Editing UX | Improve the lead-stage dashboard and intake page so submitted information is reviewable and editable. |
| 26 | Dashboard Backend API and Deliberate Query Slices | Create `/api/dashboard` with a bounded response that does not dump the entire client partition. |
| 27 | Dashboard Frontend by Lifecycle Status | Render dashboard modules based on backend feature flags and client lifecycle status. |
| 28 | Internal Admin Data Model and Seed Script | Add a clean admin model that does not use a fake client membership. |
| 29 | Admin Client Index and Backend List Endpoint | Add efficient admin client listing by status without scanning the table. |
| 30 | Admin Detail, Status Change, and Project Backend | Let admins inspect a client, change lifecycle status, and create basic project records. |
| 31 | Admin Frontend List and Detail Pages | Build the admin UI for client lifecycle management using the backend admin endpoints. |
| 32 | S3 Upload Bucket Terraform Foundation | Create the private upload bucket with browser CORS and safe defaults. |
| 33 | S3 File Handler IAM and Environment Wiring | Give only the file handler the S3 permissions and environment values it needs. |
| 34 | File Safety Utilities and Metadata Model | Implement file validation, filename sanitization, blocked extension logic, and metadata item builders. |
| 35 | File Presigned Upload Backend | Implement upload URL creation and completion verification for browser-to-S3 uploads. |
| 36 | File List, Download URL, and Soft Delete Backend | Add backend file browsing and download/delete operations with tenant checks. |
| 37 | File Upload Frontend | Build the browser-to-S3 file upload interface for active clients. |
| 38 | Messages Backend | Add portal-native message threads and replies as the canonical communication record. |
| 39 | Messages Frontend | Build the client-facing message UI using portal-native message endpoints. |
| 40 | SES Notification Scaffold | Add optional email notifications for portal messages without making email the source of truth. |
| 41 | Billing Backend Scaffold | Add invoice metadata retrieval and a safe Stripe portal endpoint that returns 501 when unconfigured. |
| 42 | Billing Frontend Scaffold | Build a client billing page that displays invoice metadata and links to Stripe only when available. |
| 43 | Structured Logging, Request IDs, and Error Consistency | Standardize operational logging and error response behavior across Lambda handlers. |
| 44 | CloudWatch Log Retention and Alarms | Add basic production observability resources through Terraform. |
| 45 | AWS WAF Rate Limiting for CloudFront `/api/*` | Add rate-based abuse protection for the portal API at CloudFront. |
| 46 | Backend Test Expansion and Tenant Isolation Regression Suite | Consolidate backend tests around the most important security behavior. |
| 47 | Frontend Build, Typecheck, and Route Regression Suite | Add frontend validation around protected routes and the portal app shell. |
| 48 | CI Validation Hardening | Update CI/release validation to run the frontend, backend, shared, and Terraform checks in the right order. |
| 49 | Documentation and Runbooks | Create repo-ready documentation for future Codex runs and human deployment/testing. |
| 50 | Final Integration and Manual Acceptance Matrix | Run the full MVP validation matrix, clean up temporary code, and prepare the repo for future feature work. |

---

## 6. Standard Codex Invocation Template

For each phase, use the specific prompt shown in that phase. This general structure is always valid:

```text
Use `client-portal-codex-mvp-phase-plan.md` as the implementation contract.
Implement Phase [NUMBER] only: [PHASE NAME].
Do not implement later phases.
Do not rename `Frontend`, `Backend`, or `Terraform`.
Preserve Terraform as the infrastructure source of truth.
Preserve existing styling and marketing pages.
If Terraform changes are required, run fmt/validate/plan but do not apply.
At the end, provide files changed, commands run, tests passing/failing, assumptions, and deferred work.
```

---

# Phase 1 — Repository Discovery and Baseline Inventory

## Goal

Create an accurate, written inventory of the existing repo before any portal implementation begins.

## Involved areas

- Existing top-level folders: `Frontend`, `Backend`, and `Terraform` must be preserved.
- Existing frontend build tooling, React/Vite setup, static hosting assumptions, and marketing pages.
- Existing backend .NET Lambda health API and its Terraform wiring.
- Existing CI/deployment scripts, especially artifact packaging scripts.

## Tasks for Codex

- Inspect the repo tree and identify frontend, backend, Terraform, and CI/deployment entry points.
- Record the current build commands and package manager conventions.
- Identify the current Lambda function, handler, runtime, artifact path, and Terraform resources that reference it.
- Identify how CloudFront routes `/api/*` to API Gateway today.
- Create or update a short `docs/client-portal/repo-baseline.md` with findings.

## Resources / files likely touched

- Repo tree
- package files
- Terraform modules/resources
- CI/deploy scripts
- existing README/docs

## Do not do in this phase

- Do not rename `Frontend`, `Backend`, or `Terraform`.
- Do not add Auth0, DynamoDB, or S3 portal resources yet.
- Do not replace the .NET Lambda yet.
- Do not change marketing page behavior.

## Validation commands / checks

- List current build commands discovered
- Run existing frontend build if available
- Run existing Terraform fmt/validate only if current setup supports it
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- A baseline doc exists and accurately describes the current repo layout.
- Known current build/deploy commands are documented.
- Codex can point to the exact Terraform resources and scripts that will be affected later.

## Specific Codex prompt for this phase

```text
Use `client-portal-codex-mvp-phase-plan.md` as the implementation contract. Implement Phase 1 only: Repository Discovery and Baseline Inventory. Inspect the existing repo and create `docs/client-portal/repo-baseline.md` documenting the current `Frontend`, `Backend`, and `Terraform` layout, current build/deploy commands, current .NET health Lambda wiring, CloudFront `/api/*` behavior, and CI/artifact scripts. Do not rename folders. Do not implement portal features. End with files changed, commands run, findings, assumptions, and deferred work.
```

---

# Phase 2 — Deployment Script and Artifact Packaging Audit

## Goal

Understand exactly how the repo packages and deploys artifacts before the backend runtime migration.

## Involved areas

- CI scripts and local deployment scripts.
- The current .NET publish/package path.
- Frontend build output and S3/CloudFront deployment assumptions.
- Terraform Lambda artifact references and `source_code_hash` behavior.

## Tasks for Codex

- Inspect `scripts/cicd/package_release_artifacts.sh` or the equivalent script. The current script is expected to assume `dotnet publish`; document exactly where.
- Map which artifacts Terraform expects and where they are generated.
- Create a migration note explaining how Node/TypeScript Lambda zip files should replace or coexist with the current .NET artifact.
- Do not make the packaging change yet unless it is limited to adding comments/docs.

## Resources / files likely touched

- scripts/cicd/package_release_artifacts.sh
- Terraform Lambda resources
- CI workflow files
- Backend project files

## Do not do in this phase

- Do not remove .NET Lambda code yet.
- Do not change Terraform Lambda runtime yet.
- Do not change production deployment behavior.

## Validation commands / checks

- Shell syntax check if practical
- No build regression
- No Terraform apply
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- The packaging migration risk is documented before runtime changes begin.
- Codex identifies exactly which script lines assume .NET packaging.
- A later TypeScript packaging phase has clear inputs and outputs.

## Specific Codex prompt for this phase

```text
Implement Phase 2 only: Deployment Script and Artifact Packaging Audit. Inspect the CI and local deployment scripts, especially `scripts/cicd/package_release_artifacts.sh`, and document how the current .NET Lambda is built and packaged. Identify what Terraform expects for Lambda zip artifacts and `source_code_hash`. Create or update `docs/client-portal/deployment-artifact-audit.md`. Do not change runtime, Lambda code, or Terraform resources yet. End with exact scripts/resources found and the recommended migration path for a later phase.
```

---

# Phase 3 — Workspace and Package Boundary Preparation

## Goal

Prepare TypeScript package boundaries without restructuring the repo or breaking existing builds.

## Involved areas

- Root package/workspace configuration if applicable.
- A shared package location that works with existing folders, such as `Shared` or `packages/shared`, without forcing folder renames.
- Frontend dependency wiring.
- Backend TypeScript dependency wiring, to be used later.

## Tasks for Codex

- Choose the least disruptive workspace structure based on the existing package manager.
- Do not rename `Frontend`, `Backend`, or `Terraform`; adapt naming to the repo.
- Add or prepare TypeScript config references only where safe.
- Add a placeholder shared package with an exported version constant or tiny no-op utility to prove imports/build work.
- Document the workspace structure in `docs/client-portal/workspace.md`.

## Resources / files likely touched

- package.json
- tsconfig files
- Frontend package
- Backend package
- Shared/package folder

## Do not do in this phase

- Do not convert the full frontend yet.
- Do not implement schemas yet beyond a placeholder export.
- Do not change Terraform.

## Validation commands / checks

- npm install or package-manager equivalent
- Existing frontend build must still pass
- Shared package build if added
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- The repo has a clear place for shared schemas.
- Existing frontend build still works.
- No top-level repo folders were renamed.

## Specific Codex prompt for this phase

```text
Implement Phase 3 only: Workspace and Package Boundary Preparation. Set up the smallest safe TypeScript/shared package boundary that fits the existing repo. Preserve the existing `Frontend`, `Backend`, and `Terraform` folder names. Add only a minimal placeholder shared export and any necessary tsconfig/package wiring. Keep existing marketing pages building. Do not add portal schemas or backend handlers yet. Run the available build checks and summarize any package-manager assumptions.
```

---

# Phase 4 — Shared Core TypeScript Types and Status Enums

## Goal

Create the first real shared types: lifecycle statuses, roles, feature flags, and common API envelopes.

## Involved areas

- Shared TypeScript package.
- Zod dependency setup.
- Core enum schemas used by every later phase.

## Tasks for Codex

- Add Zod to the shared package.
- Define `ClientStatus`, `ProjectStatus`, `MembershipRole`, `FileCategory`, `UploadStatus`, `InvoiceStatus`, and common response/error types.
- Define `FeatureFlags` and `MeResponse` type skeletons without implementing backend behavior.
- Export inferred TypeScript types from the shared package.
- Add unit tests for enum validation and feature flag schema basics.

## Resources / files likely touched

- Shared schemas/types
- shared test config
- Vitest or repo's test runner

## Do not do in this phase

- Do not implement intake schema yet.
- Do not change frontend pages yet.
- Do not create AWS resources.

## Validation commands / checks

- Build shared package
- Run shared tests
- Existing frontend build still passes if wired
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Core statuses and roles are represented by Zod schemas and inferred types.
- Shared tests pass.
- Later phases can import shared types without duplicating status strings.

## Specific Codex prompt for this phase

```text
Implement Phase 4 only: Shared Core TypeScript Types and Status Enums. In the shared package, add Zod schemas and inferred TypeScript types for client statuses, project statuses, membership roles, file categories, upload statuses, invoice statuses, common API error/envelope types, and feature flag response shapes. Add focused unit tests. Do not implement intake, backend routes, frontend routes, or Terraform changes. Preserve current folder names and existing builds.
```

---

# Phase 5 — Shared Intake, Profile, and Request Schemas

## Goal

Add the full intake/profile/request schema set used by frontend forms and backend validation.

## Involved areas

- Intake form data schema.
- Profile update schema.
- Dashboard/intake/API request and response schemas.
- File/message/billing/admin request schemas as type definitions only where useful.

## Tasks for Codex

- Create `IntakeFormDataSchema` with business basics, goals, features, design references, content readiness, technical state, data sensitivity, budget/timeline, maintenance interest, terms/no-secrets acknowledgments, and notes.
- Create `UpdateIntakeRequestSchema`, `UpdateClientProfileRequestSchema`, and dashboard/intake response schemas.
- Create request schemas for future file/message/billing/admin endpoints without implementing routes.
- Add unit tests for valid intake, missing required acknowledgments, invalid URLs, and enum fields.
- Add a short schema README or docs section explaining the intake fields.

## Resources / files likely touched

- Shared schema package
- Shared tests
- docs/client-portal/shared-schemas.md

## Do not do in this phase

- Do not create intake UI yet.
- Do not create backend intake route yet.
- Do not relax required terms/no-secrets acknowledgement validation.

## Validation commands / checks

- Build shared package
- Run shared schema tests
- Existing frontend build still passes
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Intake and profile validation is complete enough for frontend/backend use.
- Schemas reject unsafe or incomplete inputs.
- Future endpoint schemas are exported and documented.

## Specific Codex prompt for this phase

```text
Implement Phase 5 only: Shared Intake, Profile, and Request Schemas. Add the full Zod intake schema, update-intake request schema, client-profile update schema, and initial request/response schemas for files, messages, billing, and admin. Add tests for valid and invalid intake payloads, including required terms and no-secrets warnings. Do not build UI or backend endpoints yet. Use the shared package created in earlier phases and keep the repo's existing folder names.
```

---

# Phase 6 — Shared Schema Integration Smoke Test

## Goal

Prove the frontend and backend can import shared schemas before large feature work begins.

## Involved areas

- Frontend import path resolution.
- Backend import path resolution or planned import path if backend TS scaffold is not ready.
- Build scripts and TypeScript configuration.

## Tasks for Codex

- Add a tiny frontend-side import/use of a shared type or schema in a non-invasive location, such as a dev-only constants file or API types file.
- If backend TypeScript is not scaffolded yet, add a documented planned import path and defer actual backend import to Phase 7.
- Ensure shared package build order is documented.
- Do not change user-visible frontend behavior.

## Resources / files likely touched

- Frontend tsconfig/package config
- Shared package
- docs/client-portal/workspace.md

## Do not do in this phase

- Do not convert all frontend files to TS yet.
- Do not add Auth0 yet.
- Do not create backend handlers yet.

## Validation commands / checks

- Shared build
- Frontend build
- Typecheck if available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Shared schemas can be consumed by the frontend without breaking the existing app.
- Any remaining backend import work is explicitly deferred.

## Specific Codex prompt for this phase

```text
Implement Phase 6 only: Shared Schema Integration Smoke Test. Prove that the frontend can import the shared package without breaking the current app. Add the smallest non-invasive import or type usage possible. Do not change UI behavior, auth, backend, or Terraform. Document build order and any path-alias assumptions. Run shared and frontend builds.
```

---

# Phase 7 — Backend TypeScript Scaffold

## Goal

Introduce TypeScript backend source structure while leaving the deployed .NET Lambda untouched.

## Involved areas

- Backend TypeScript package config.
- Backend `src` folder structure.
- AWS Lambda type dependencies.
- Build output folder for future Lambda zip artifacts.

## Tasks for Codex

- Create TypeScript backend project structure under the existing `Backend` folder or compatible subfolder.
- Add `tsconfig`, build script, and a minimal handler module not yet wired to Terraform.
- Add backend utilities skeletons: `response`, `logger`, `validation`, `time`, `ids`.
- Ensure backend can import the shared package.
- Do not remove or deploy the existing .NET Lambda yet.

## Resources / files likely touched

- Backend/package.json
- Backend/tsconfig.json
- Backend/src
- shared package imports

## Do not do in this phase

- Do not modify Terraform Lambda runtime in this phase.
- Do not remove the .NET project.
- Do not create real portal routes yet.

## Validation commands / checks

- Backend TypeScript build
- Shared build
- Existing frontend build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- TypeScript backend source compiles locally.
- No deployed infrastructure changed.
- Backend can import shared schemas/types.

## Specific Codex prompt for this phase

```text
Implement Phase 7 only: Backend TypeScript Scaffold. Add a TypeScript backend project under the existing `Backend` folder without removing the current .NET Lambda or changing Terraform. Add basic utility skeletons and prove the backend can import shared schemas. Add build scripts and run the backend build. Do not wire this to API Gateway yet. Preserve deployment behavior.
```

---

# Phase 8 — Backend Lambda Packaging Script Migration

## Goal

Update artifact packaging so a TypeScript/Node Lambda zip can be produced repeatably, without changing the deployed runtime yet.

## Involved areas

- `scripts/cicd/package_release_artifacts.sh` or equivalent.
- Backend build output.
- Lambda zip creation.
- Terraform artifact path expectations.

## Tasks for Codex

- Modify packaging scripts to build and zip the TypeScript backend artifact in addition to, or in a clearly controlled replacement of, the .NET artifact.
- Use `source_code_hash`-compatible deterministic artifact outputs where Terraform expects them.
- Document artifact names and paths.
- Keep current deployment safe; do not switch Terraform to the Node artifact yet unless a separate flag makes it inert.

## Resources / files likely touched

- scripts/cicd/package_release_artifacts.sh
- Backend build scripts
- Terraform artifact variables/docs

## Do not do in this phase

- Do not change the live Lambda runtime yet.
- Do not delete .NET publishing before the replacement is proven.
- Do not run `terraform apply`.

## Validation commands / checks

- Run packaging script locally if possible
- Verify TypeScript Lambda zip exists
- Backend build
- Terraform fmt/validate if files changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- A Node/TypeScript Lambda zip can be produced.
- The script no longer assumes only `dotnet publish` without documentation.
- Terraform can later consume the artifact path confidently.

## Specific Codex prompt for this phase

```text
Implement Phase 8 only: Backend Lambda Packaging Script Migration. Update the existing artifact packaging flow so it can build and zip the TypeScript backend Lambda artifact. The current script likely assumes `dotnet publish`; adapt it carefully and document artifact paths. Do not switch Terraform to Node yet and do not remove the .NET artifact unless explicitly safe. Run the packaging script or explain why it cannot run, and summarize exact artifact outputs.
```

---

# Phase 9 — Minimal Node `/api/health` Lambda Replacement

## Goal

Safely replace or shadow the .NET health Lambda with a Node/TypeScript health Lambda.

## Human checkpoint

Human must review `terraform plan` before any apply. Confirm only the health Lambda/runtime/artifact changes are present.

## Involved areas

- Terraform Lambda runtime/artifact configuration.
- API Gateway route for `/api/health`.
- CloudFront existing `/api/*` origin behavior.
- Health handler response format.

## Tasks for Codex

- Implement a minimal TypeScript `GET /api/health` handler returning JSON with status, runtime, and requestId.
- Update Terraform to point the health Lambda to Node.js runtime and the TypeScript artifact if appropriate.
- Use `source_code_hash` so code changes trigger Lambda updates.
- Keep the change scoped to health only.
- Document rollback to the previous .NET artifact/runtime.

## Resources / files likely touched

- Backend health handler
- Terraform Lambda function
- API route integration
- packaging script

## Do not do in this phase

- Do not add Auth0/JWT yet.
- Do not add DynamoDB yet.
- Do not implement `/api/me` yet.
- Do not run Terraform apply without human approval.

## Validation commands / checks

- Backend build
- Package artifact
- Terraform fmt
- Terraform validate
- Terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Terraform plan shows only the intended Lambda/runtime/artifact changes.
- Health handler compiles and packages.
- Rollback notes are documented.

## Specific Codex prompt for this phase

```text
Implement Phase 9 only: Minimal Node `/api/health` Lambda Replacement. Add a TypeScript health handler and update Terraform to use the Node/TypeScript artifact for the existing health API only. Use `source_code_hash`. Keep the scope limited to `/api/health`. Run build, package, terraform fmt/validate, and produce a Terraform plan for human review. Do not apply Terraform unless explicitly instructed. Do not add Auth0, DynamoDB, or portal routes yet.
```

---

# Phase 10 — API Routing Strategy and Handler Group Skeletons

## Goal

Create a clear routing strategy for grouped TypeScript Lambda handlers without implementing feature logic.

## Involved areas

- Backend handler grouping: identity/intake, files, messages, billing, admin, health.
- API Gateway route mapping under `/api/*`.
- A lightweight internal router if one Lambda handles multiple routes.

## Tasks for Codex

- Decide, based on current Terraform, whether to use one router Lambda or domain-grouped Lambdas.
- Create empty/skeleton handlers for identityIntake, files, messages, billing, and admin returning 501 or not-wired responses.
- Keep `/api/health` working.
- Add route docs showing future endpoint ownership.

## Resources / files likely touched

- Backend/src/handlers
- Backend/src/router
- Terraform route docs
- docs/client-portal/api-routing.md

## Do not do in this phase

- Do not implement auth, DB, files, messages, or billing logic yet.
- Do not expose protected routes publicly as working endpoints yet.
- Do not add lots of routes to Terraform unless they return safe 501 and are explicitly documented.

## Validation commands / checks

- Backend build
- Package artifact
- Existing health test/build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Handler group boundaries are clear.
- Future route ownership is documented.
- No functional portal behavior is accidentally exposed.

## Specific Codex prompt for this phase

```text
Implement Phase 10 only: API Routing Strategy and Handler Group Skeletons. Based on the current Terraform/API Gateway model, create a minimal TypeScript routing/handler grouping strategy for future identity, files, messages, billing, and admin handlers. Keep `/api/health` working. Future handlers may return safe 501 placeholders only. Do not implement auth, DynamoDB, S3, messages, or billing behavior yet. Document the route ownership model.
```

---

# Phase 11 — Auth0 Terraform Variables and API Gateway JWT Authorizer

## Goal

Add Auth0 JWT validation to API Gateway without building portal business logic yet.

## Human checkpoint

Human must review Terraform plan. Confirm `/api/health` remains public and only intended protected-route/JWT authorizer changes are present.

## Involved areas

- Terraform variables for Auth0 domain/audience.
- API Gateway HTTP API JWT authorizer.
- Route-level scope strategy.
- Protected test route or placeholder protected route.

## Tasks for Codex

- Add `auth0_domain` and `auth0_audience` variables with safe documentation and no committed real secret values.
- Create HTTP API JWT authorizer with issuer `https://{auth0_domain}/` and configured audience.
- Protect a test route or future placeholder route; leave `/api/health` public.
- Document required Auth0 API settings and scopes.
- Remember API Gateway scope checks are `any matching scope`, so choose route scopes carefully.

## Resources / files likely touched

- Terraform API Gateway resources
- Terraform variables
- docs/client-portal/auth0-setup.md

## Do not do in this phase

- Do not implement `/api/me` yet.
- Do not add frontend Auth0 yet.
- Do not commit Auth0 tenant secrets or real env values.
- Do not apply Terraform without human plan review.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- JWT authorizer is defined and health remains public.
- Protected route configuration is visible in Terraform plan.
- Auth0 setup docs describe audience, issuer, RBAC, and scopes.

## Specific Codex prompt for this phase

```text
Implement Phase 11 only: Auth0 Terraform Variables and API Gateway JWT Authorizer. Add Terraform variables and resources for an HTTP API JWT authorizer using Auth0 issuer/audience. Keep `/api/health` public. Add or protect only a placeholder/test route if needed. Document Auth0 API audience, RBAC/scopes, and callback/origin requirements. Do not implement `/api/me` or frontend Auth0 yet. Run terraform fmt/validate and produce a plan for human review; do not apply.
```

---

# Phase 12 — CloudFront `/api/*` Authorization and No-Cache Hardening

## Goal

Ensure authenticated API traffic is safely forwarded through CloudFront without private-response caching bugs.

## Human checkpoint

Human must review CloudFront plan carefully, especially because CloudFront pricing-plan or distribution drift can appear unrelated to this phase.

## Involved areas

- CloudFront cache behavior for `/api/*`.
- Authorization header forwarding.
- CORS/OPTIONS forwarding.
- Private API response cache headers.

## Tasks for Codex

- Update or document `/api/*` behavior to disable caching for API requests or otherwise include Authorization in cache key safely.
- Forward `Authorization` header to API Gateway.
- Forward CORS-related headers required by browser Auth0/API calls.
- Ensure methods include GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE as needed.
- Add backend response helper defaults for private API responses: `Cache-Control: no-store`.

## Resources / files likely touched

- Terraform CloudFront distribution/behavior
- Backend response helper
- CORS docs

## Do not do in this phase

- Do not implement portal features yet.
- Do not cache authenticated API responses.
- Do not run Terraform apply without human plan review.

## Validation commands / checks

- Backend build if response helper changed
- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- `/api/*` behavior forwards Authorization and does not cache private responses.
- Private response helper includes no-store by default.
- Plan does not contain unrelated CloudFront drift beyond documented known issues.

## Specific Codex prompt for this phase

```text
Implement Phase 12 only: CloudFront `/api/*` Authorization and No-Cache Hardening. Update Terraform so `/api/*` forwards Authorization and CORS headers to API Gateway and disables caching for authenticated API responses. Add backend response-helper defaults for private responses using `Cache-Control: no-store`. Do not implement portal business routes. Run terraform fmt/validate and produce a plan for human review. Pay special attention to existing CloudFront drift; do not apply.
```

---

# Phase 13 — DynamoDB Table Terraform Foundation

## Goal

Create the portal source-of-truth table with indexes and production data protections.

## Human checkpoint

Human must review Terraform plan before apply because this creates persistent data resources.

## Involved areas

- DynamoDB table `ClientPortal-{env}`.
- Primary key `PK`/`SK`.
- GSI1 and GSI2.
- PAY_PER_REQUEST billing.
- Point-in-time recovery.
- Destroy protections and opt-in destruction flags.

## Tasks for Codex

- Add the DynamoDB table in Terraform with `PK` and `SK` string keys.
- Add `GSI1PK/GSI1SK` and `GSI2PK/GSI2SK` indexes.
- Enable PITR and pay-per-request billing.
- Add lifecycle/prevent-destroy or environment-guard logic for production data resources.
- Document how dev/staging destruction requires explicit opt-in.

## Resources / files likely touched

- Terraform DynamoDB resources
- Terraform variables
- docs/client-portal/terraform-deployment.md

## Do not do in this phase

- Do not create app code using the table yet.
- Do not create S3 upload bucket yet.
- Do not run Terraform apply without human review.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Table and indexes are defined correctly.
- PITR is enabled.
- Production accidental destroy is guarded.
- Plan is ready for review.

## Specific Codex prompt for this phase

```text
Implement Phase 13 only: DynamoDB Table Terraform Foundation. Add the `ClientPortal-{env}` DynamoDB table with PK/SK, GSI1, GSI2, PAY_PER_REQUEST billing, PITR, and production destroy protections with explicit dev/staging opt-in. Do not add app logic yet. Run terraform fmt/validate and produce a plan for human review. Do not apply Terraform.
```

---

# Phase 14 — DynamoDB IAM and Environment Wiring

## Goal

Give the appropriate Lambda handler group least-privilege access to the portal table and expose table name through env vars.

## Human checkpoint

Human must review IAM permissions and Terraform plan before apply.

## Involved areas

- Lambda execution roles.
- DynamoDB IAM policies.
- `CLIENT_PORTAL_TABLE` environment variable.
- Handler group permissions.

## Tasks for Codex

- Add least-privilege DynamoDB permissions for relevant Lambda handlers: GetItem, PutItem, UpdateItem, DeleteItem if needed, Query, BatchGetItem if used.
- Include index ARNs for GSI queries.
- Add `CLIENT_PORTAL_TABLE` environment variable to handlers that will access the table.
- Do not grant S3, SES, Stripe, or admin-only permissions yet.

## Resources / files likely touched

- Terraform Lambda IAM
- Terraform Lambda env vars
- IAM docs

## Do not do in this phase

- Do not implement DynamoDB repository code yet.
- Do not over-grant `dynamodb:*`.
- Do not apply Terraform without human plan review.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Handlers that will need DynamoDB have table env var and scoped permissions.
- IAM plan is least-privilege and readable.

## Specific Codex prompt for this phase

```text
Implement Phase 14 only: DynamoDB IAM and Environment Wiring. Add least-privilege DynamoDB IAM permissions and `CLIENT_PORTAL_TABLE` environment variables for the Lambda handler groups that will need the portal table. Include GSI index ARNs. Do not implement repository code yet and do not grant broad `dynamodb:*`. Run terraform fmt/validate and provide a Terraform plan for human review; do not apply.
```

---

# Phase 15 — Backend DynamoDB Key Builders and Repository Utilities

## Goal

Create typed DynamoDB access helpers and item builders without implementing API behavior.

## Involved areas

- Backend DynamoDB client setup.
- Key builders for all item types.
- Repository wrappers for Get/Put/Update/Query.
- Audit event helper.

## Tasks for Codex

- Add AWS SDK v3 DynamoDB client and document client usage.
- Add deterministic key builders for CLIENT, USER, MEMBERSHIP, ADMIN, INTAKE, PROJECT, FILE, THREAD, MESSAGE, INVOICE, and AUDIT items.
- Add typed item-builder helpers using shared schemas/types where appropriate.
- Add repository functions with small, testable units.
- Add tests for keys, item shapes, and no-scan expectations.

## Resources / files likely touched

- Backend/src/dynamodb
- Backend tests
- Shared types

## Do not do in this phase

- Do not implement `/api/me` yet.
- Do not call real AWS services in unit tests unless existing test setup supports it.
- Do not scan the table for normal access patterns.

## Validation commands / checks

- Backend build
- Backend tests
- Shared tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- DynamoDB helper layer compiles and is unit-tested.
- Key patterns match the planned item model.
- Repository utilities avoid accidental table scans.

## Specific Codex prompt for this phase

```text
Implement Phase 15 only: Backend DynamoDB Key Builders and Repository Utilities. Add typed AWS SDK v3 DynamoDB helpers, key builders, item builders, and repository utilities for the portal single-table model. Add unit tests for key formats and item shapes. Do not implement `/api/me` or any route logic yet. Avoid table scans for normal access patterns. Run backend build and tests.
```

---

# Phase 16 — Backend Auth Claim Parsing and Response Utilities

## Goal

Create backend utilities for reading API Gateway JWT claims and returning consistent responses/errors.

## Involved areas

- API Gateway v2 event parsing.
- JWT claim extraction.
- Scope checking helpers.
- Error response shape and requestId/correlationId.

## Tasks for Codex

- Implement `getAuthContext(event)` to read JWT claims from HTTP API event context.
- Extract `sub`, `email`, `email_verified`, and scopes/permissions safely.
- Implement `requireScopes` helper that treats scopes carefully and does not assume multiple scopes are ANDed by API Gateway.
- Implement `jsonResponse`, `errorResponse`, and `noStore` defaults for private routes.
- Add tests for missing claims, malformed scopes, and error response requestId.

## Resources / files likely touched

- Backend/src/shared/auth.ts
- Backend/src/shared/response.ts
- Backend tests

## Do not do in this phase

- Do not implement tenant resolver yet.
- Do not trust clientId from body/query.
- Do not add frontend auth yet.

## Validation commands / checks

- Backend build
- Backend tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Auth context parsing works with API Gateway HTTP API JWT claim shape.
- Private responses consistently include no-store headers.
- Errors include requestId.

## Specific Codex prompt for this phase

```text
Implement Phase 16 only: Backend Auth Claim Parsing and Response Utilities. Add backend utilities to parse Auth0 JWT claims from API Gateway HTTP API events, check scopes, and return consistent JSON/error responses with requestId and `Cache-Control: no-store` for private routes. Add focused unit tests. Do not implement tenant resolution or app routes yet.
```

---

# Phase 17 — Tenant Resolver and Feature Flag Engine

## Goal

Resolve authenticated users to client context through DynamoDB membership and generate lifecycle feature flags.

## Involved areas

- `resolveClientContext` for normal users.
- Feature flag generation by client status.
- Membership queries through GSI1.
- Future multi-client compatibility.

## Tasks for Codex

- Implement resolver for `JWT sub → USER profile → active MEMBERSHIP → CLIENT profile`.
- For MVP, choose a default active membership if exactly one exists; if multiple exist, design response to support selection later.
- Never trust frontend `clientId` for normal users.
- Implement feature flag rules for lead, intake_submitted, qualified, proposal_sent, contract_sent, active, maintenance, and archived.
- Add tests for no membership, inactive membership, multiple memberships, and each status' feature flags.

## Resources / files likely touched

- Backend/src/tenant
- DynamoDB repository
- Shared feature flag schema
- Backend tests

## Do not do in this phase

- Do not create users/clients yet.
- Do not implement admin resolver yet.
- Do not accept arbitrary clientId for normal users.

## Validation commands / checks

- Backend build
- Backend tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Tenant resolver enforces membership-based access.
- Feature flags are generated server-side.
- Tests cover tenant isolation basics.

## Specific Codex prompt for this phase

```text
Implement Phase 17 only: Tenant Resolver and Feature Flag Engine. Build the backend resolver that maps JWT subject to active user membership and client profile using DynamoDB, and add lifecycle-driven feature flags. Do not create `/api/me` bootstrap yet. Do not accept frontend clientId for normal users. Add tests for membership resolution and feature flags by status.
```

---

# Phase 18 — `/api/me` Bootstrap Endpoint

## Goal

Implement the first real authenticated portal route: user/client/membership bootstrap.

## Human checkpoint

If Terraform routes or authorizer scopes change, human must review the plan before apply.

## Involved areas

- Identity/intake handler group.
- User profile creation.
- Client profile creation.
- Membership creation.
- Feature flags response.

## Tasks for Codex

- Implement `GET /api/me` requiring auth and `read:me` where route scopes are configured.
- If USER does not exist, create it from JWT subject/email/name claims.
- If the user has no client membership, create a new CLIENT with status `lead` and a `client_owner` MEMBERSHIP.
- Use conditional writes where practical to avoid duplicate bootstraps.
- Return user, client, membership, and feature flags.
- Add handler tests for new user bootstrap and existing user retrieval.

## Resources / files likely touched

- Backend identity handler
- DynamoDB repository
- Tenant resolver
- API route Terraform if needed

## Do not do in this phase

- Do not implement intake PUT yet.
- Do not add frontend Auth0 yet if not already in scope.
- Do not allow request body clientId to choose bootstrap client.

## Validation commands / checks

- Backend build
- Backend tests
- terraform fmt/validate/plan if route resources changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- `GET /api/me` bootstraps new users safely.
- Existing users are returned without duplicate clients.
- Response matches shared schema.

## Specific Codex prompt for this phase

```text
Implement Phase 18 only: `/api/me` Bootstrap Endpoint. Add the authenticated `GET /api/me` route. It must create USER, CLIENT(status `lead`), and MEMBERSHIP(role `client_owner`) for a first-time user, or return existing context for returning users. Use conditional writes where practical. Never trust clientId from the frontend. Add handler tests. If Terraform route changes are required, run terraform fmt/validate and produce a plan for review without applying.
```

---

# Phase 19 — Frontend TypeScript Conversion Foundation

## Goal

Start the frontend TypeScript migration safely without changing portal behavior yet.

## Involved areas

- Existing `Frontend` Vite/React app.
- TypeScript config and `.tsx` entry points.
- Existing marketing pages and styling.

## Tasks for Codex

- Add TypeScript support if not already present.
- Convert only the minimum entry/app files needed to support future portal routes, or set up allowJs if full conversion is not safe yet.
- Do not rewrite visual components unnecessarily.
- Ensure existing marketing pages continue building and rendering.
- Document remaining JS/JSX conversion strategy.

## Resources / files likely touched

- Frontend/package.json
- Frontend/tsconfig.json
- Frontend/src

## Do not do in this phase

- Do not add Auth0 yet.
- Do not add dashboard/intake pages yet.
- Do not rename `Frontend`.
- Do not break existing marketing pages.

## Validation commands / checks

- Frontend build
- Frontend typecheck if available
- Existing tests if available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Frontend can compile with TypeScript support.
- Existing marketing pages still build.
- No major visual rewrite occurred.

## Specific Codex prompt for this phase

```text
Implement Phase 19 only: Frontend TypeScript Conversion Foundation. Add or refine TypeScript support in the existing `Frontend` app while preserving current marketing pages and styling. Convert only the minimum files needed for future portal work or use a safe gradual migration strategy. Do not add Auth0, protected routes, or portal pages yet. Run the frontend build and typecheck if available.
```

---

# Phase 20 — Frontend Auth0 Provider and Callback Route

## Goal

Add Auth0 login plumbing to the frontend without building protected portal screens yet.

## Involved areas

- Auth0 React SDK.
- Environment variables for Auth0 domain/client/audience/API URL.
- Callback route/page.
- Logout/login controls if existing layout supports them.

## Tasks for Codex

- Install and configure `@auth0/auth0-react`.
- Create `AppAuthProvider` using `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE`.
- Use `redirect_uri` ending in `/callback`.
- Request client scopes only by default; admin scopes should be requested later only where needed.
- Add a simple `/callback` route/page that returns the user to `/dashboard` after login.
- Update `.env.example` with placeholders only.

## Resources / files likely touched

- Frontend auth folder
- Frontend router
- Frontend env examples
- Auth0 setup docs

## Do not do in this phase

- Do not implement dashboard UI yet.
- Do not request admin scopes globally.
- Do not commit real Auth0 values.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Existing marketing pages still build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Auth0Provider is wired with correct env variables.
- Callback route exists.
- No real secrets are committed.

## Specific Codex prompt for this phase

```text
Implement Phase 20 only: Frontend Auth0 Provider and Callback Route. Add Auth0 React SDK wiring using `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE`, with redirect to `/callback` and client scopes only by default. Add `.env.example` placeholders and a callback route. Do not implement dashboard/intake UI or admin scopes yet. Preserve marketing pages and run the frontend build.
```

---

# Phase 21 — Frontend Protected Route and Tokenized API Client

## Goal

Create the frontend primitives needed to call protected API routes.

## Involved areas

- ProtectedRoute component.
- Central API client using `getAccessTokenSilently()`.
- TanStack Query setup if not already present.
- Error/loading states.

## Tasks for Codex

- Add `ProtectedRoute` that waits for Auth0 loading and redirects unauthenticated users to login.
- Add a central API client that attaches `Authorization: Bearer <token>`.
- Add consistent handling for 401, 403, and API errors with requestId.
- Set up TanStack Query provider if not present.
- Do not build specific portal pages yet beyond a placeholder protected page if needed.

## Resources / files likely touched

- Frontend/src/auth
- Frontend/src/api
- Frontend app providers
- Frontend components

## Do not do in this phase

- Do not build intake/dashboard UI yet.
- Do not add admin token handling yet.
- Do not hardcode API URLs or tokens.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Existing marketing pages still build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- ProtectedRoute and API client are reusable for later phases.
- Token acquisition is centralized.
- API errors are displayed safely.

## Specific Codex prompt for this phase

```text
Implement Phase 21 only: Frontend Protected Route and Tokenized API Client. Add `ProtectedRoute`, loading/error states, TanStack Query provider if needed, and a central API client that gets an Auth0 access token silently and sends it as `Authorization: Bearer`. Handle 401/403/requestId errors consistently. Do not build dashboard, intake, files, messages, billing, or admin pages yet. Run frontend build/typecheck.
```

---

# Phase 22 — Frontend `/dashboard` Shell Calling `/api/me`

## Goal

Connect the frontend to the first authenticated backend endpoint and show a minimal dashboard shell.

## Involved areas

- `/dashboard` route.
- `GET /api/me` query.
- Feature flag display/debug summary.
- Client status badge placeholder.

## Tasks for Codex

- Add `/dashboard` protected route.
- Call `/api/me` through the central API client and validate response where practical.
- Show basic user/client/status information and next-step placeholder.
- Do not implement full dashboard modules yet.
- Ensure direct browser refresh on `/dashboard` works with SPA fallback or document Terraform/hosting follow-up if not.

## Resources / files likely touched

- Frontend routes
- Dashboard shell component
- API query hooks

## Do not do in this phase

- Do not implement intake form yet.
- Do not implement files/messages/billing/admin yet.
- Do not create fake client data in frontend.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Manual local auth/API smoke test if environment available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Authenticated user can load a minimal dashboard shell.
- Dashboard data comes from `/api/me`, not hardcoded state.
- Marketing pages continue building.

## Specific Codex prompt for this phase

```text
Implement Phase 22 only: Frontend `/dashboard` Shell Calling `/api/me`. Add a protected `/dashboard` route that calls `GET /api/me` through the tokenized API client and displays minimal user/client/status information. Do not implement intake, files, messages, billing, or admin UI yet. Ensure existing marketing pages still build and document any SPA fallback requirements discovered.
```

---

# Phase 23 — Intake Backend API

## Goal

Implement intake read/write and profile update endpoints with validation and audit events.

## Human checkpoint

If Terraform routes/scopes change, human must review plan before apply.

## Involved areas

- `GET /api/intake`.
- `PUT /api/intake`.
- `PATCH /api/client/profile`.
- Audit event writes.
- Lead to intake_submitted transition.

## Tasks for Codex

- Use shared Zod schemas for all request validation.
- Resolve client context from auth/membership; do not trust clientId.
- `GET /api/intake` returns current intake or empty/default shape.
- `PUT /api/intake` upserts `INTAKE#CURRENT`, increments/sets version, and changes client status from `lead` to `intake_submitted`.
- `PATCH /api/client/profile` updates editable profile fields only.
- Write audit events for intake/profile changes.
- Add handler tests.

## Resources / files likely touched

- Backend identity/intake handler
- Shared schemas
- DynamoDB repo
- Audit helper

## Do not do in this phase

- Do not implement intake frontend yet.
- Do not allow users to change lifecycle status directly.
- Do not trust clientId from the request body.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform fmt/validate/plan if routes changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Intake endpoints validate input and enforce tenancy.
- Lead status transitions to intake_submitted after successful intake submission.
- Audit events are written.

## Specific Codex prompt for this phase

```text
Implement Phase 23 only: Intake Backend API. Add authenticated `GET /api/intake`, `PUT /api/intake`, and `PATCH /api/client/profile` endpoints using shared Zod validation and tenant resolution. `PUT /api/intake` must upsert `INTAKE#CURRENT`, write audit events, and move `lead` clients to `intake_submitted`. Do not build frontend intake UI yet. Add handler tests and run backend build/tests. If API routes change Terraform, produce a plan but do not apply.
```

---

# Phase 24 — Intake Frontend Form Foundation

## Goal

Build the intake form UI skeleton and client-side validation without trying to perfect every UX detail.

## Involved areas

- `/intake` route.
- React Hook Form + Zod resolver.
- Intake field grouping.
- Load/save flow using intake API.

## Tasks for Codex

- Add `/intake` protected route.
- Use the shared intake schema through React Hook Form/Zod resolver.
- Group fields into understandable sections: business, goals, features, design, content, technical, timeline/budget, maintenance, acknowledgements.
- Load existing intake with `GET /api/intake` and save with `PUT /api/intake`.
- Show basic success/error states.

## Resources / files likely touched

- Frontend intake feature
- Shared schemas
- API hooks
- Existing styling system

## Do not do in this phase

- Do not implement file uploads yet.
- Do not add admin controls.
- Do not add Tailwind if not already used.
- Do not break marketing pages.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Existing marketing pages still build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- User can view and submit intake form.
- Client-side validation matches shared schema.
- Errors/success states are clear.

## Specific Codex prompt for this phase

```text
Implement Phase 24 only: Intake Frontend Form Foundation. Add a protected `/intake` route with a React Hook Form intake form using the shared Zod schema. Load current intake from `GET /api/intake` and save with `PUT /api/intake`. Use existing styling. Do not implement files, messages, billing, or admin. Keep marketing pages building and run frontend validation.
```

---

# Phase 25 — Intake Summary and Profile Editing UX

## Goal

Improve the lead-stage dashboard and intake page so submitted information is reviewable and editable.

## Involved areas

- Intake summary card.
- Profile card/edit form.
- Dashboard links to intake edit.
- Post-submit next steps state.

## Tasks for Codex

- Add `IntakeSummaryCard` showing a concise summary of saved intake.
- Add `ClientProfileCard` and editable profile flow using `PATCH /api/client/profile`.
- Update dashboard shell to show lead/intake_submitted next steps.
- Ensure intake can be edited after submission while status allows it.

## Resources / files likely touched

- Frontend dashboard feature
- Frontend intake feature
- API hooks

## Do not do in this phase

- Do not add full lifecycle dashboard modules yet.
- Do not implement admin status changes yet.
- Do not implement uploads/messages/billing.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Lead and intake_submitted users can review and edit their information.
- Profile editing calls the backend, not local-only state.
- Existing pages continue building.

## Specific Codex prompt for this phase

```text
Implement Phase 25 only: Intake Summary and Profile Editing UX. Add intake summary and client profile editing components. Update the dashboard shell to show lead/intake_submitted next steps and link to edit intake. Use `PATCH /api/client/profile` for editable profile fields. Do not implement admin, files, messages, billing, or full lifecycle dashboard modules yet.
```

---

# Phase 26 — Dashboard Backend API and Deliberate Query Slices

## Goal

Create `/api/dashboard` with a bounded response that does not dump the entire client partition.

## Involved areas

- `GET /api/dashboard`.
- Feature flags.
- Limited recent records for projects/files/threads/invoices as placeholders or actual data if present.
- No unbounded partition queries.

## Tasks for Codex

- Implement dashboard endpoint using tenant resolver.
- Retrieve client profile and current intake directly.
- Query limited slices for projects, recent files, recent threads, and invoices with limits.
- Return feature flags and next-step guidance by status.
- Add tests proving dashboard does not use a blind full partition dump.

## Resources / files likely touched

- Backend dashboard handler
- DynamoDB repo
- Feature flags
- Shared dashboard schemas

## Do not do in this phase

- Do not implement frontend full lifecycle UI yet.
- Do not scan the table.
- Do not return audit events to clients unless explicitly designed.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if routes changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- `GET /api/dashboard` returns bounded status-driven data.
- Response matches shared schema.
- Tests cover query limits and feature flags.

## Specific Codex prompt for this phase

```text
Implement Phase 26 only: Dashboard Backend API and Deliberate Query Slices. Add authenticated `GET /api/dashboard` that resolves client context, retrieves profile/intake directly, queries limited slices for projects/files/threads/invoices, and returns feature flags/next steps. Do not query and return the full client partition. Add tests for feature flags and bounded query behavior. Do not build full dashboard UI yet.
```

---

# Phase 27 — Dashboard Frontend by Lifecycle Status

## Goal

Render dashboard modules based on backend feature flags and client lifecycle status.

## Involved areas

- Dashboard page using `/api/dashboard`.
- Status badge and next steps.
- Feature-gated placeholders for projects, files, messages, billing.
- Read-only/hidden behavior by status.

## Tasks for Codex

- Replace dashboard shell data source with `/api/dashboard` where appropriate.
- Implement lead/intake_submitted dashboard with intake summary and next steps.
- Implement qualified/proposal/contract dashboard placeholders for status and messages.
- Implement active/maintenance/archived module placeholders based on feature flags.
- Do not rely on frontend feature flags as security; show/hide only for UX.

## Resources / files likely touched

- Frontend dashboard feature
- FeatureGate component
- Shared response schemas

## Do not do in this phase

- Do not implement actual file upload yet.
- Do not implement actual messages yet.
- Do not implement actual billing portal yet.
- Do not break marketing pages.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Dashboard changes by lifecycle status/feature flags.
- Hidden modules are not treated as authorization.
- Existing pages still build.

## Specific Codex prompt for this phase

```text
Implement Phase 27 only: Dashboard Frontend by Lifecycle Status. Update `/dashboard` to use `/api/dashboard` and render modules/next steps based on backend feature flags and client status. Add UX placeholders for files/messages/billing/projects where flags allow, but do not implement those features yet. Preserve existing styling and marketing pages. Run frontend build/typecheck.
```

---

# Phase 28 — Internal Admin Data Model and Seed Script

## Goal

Add a clean admin model that does not use a fake client membership.

## Involved areas

- Internal admin DynamoDB item.
- Admin resolver requiring Auth0 scope plus DynamoDB admin item.
- Seed script for internal admin users.
- Docs for admin seeding.

## Tasks for Codex

- Use an admin item such as `PK = USER#{auth0Sub}`, `SK = ADMIN#PROFILE`, `type = INTERNAL_ADMIN`, `status = active`.
- Implement `requireAdmin` that checks both JWT admin scope and active admin item.
- Create a documented seed script that inserts/removes admin item for a given Auth0 subject.
- Do not represent admins as members of a reserved fake client.
- Add tests for scope without item, item without scope, active admin, inactive admin.

## Resources / files likely touched

- Backend admin utilities
- Seed script
- DynamoDB repo
- docs/client-portal/admin-seeding.md

## Do not do in this phase

- Do not implement admin UI yet.
- Do not give all users admin access.
- Do not store admin status only in Auth0.

## Validation commands / checks

- Backend build
- Backend tests
- Seed script dry-run/help if available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Admin resolver requires both checks.
- Seed script is documented and safe.
- No fake-client admin membership is used.

## Specific Codex prompt for this phase

```text
Implement Phase 28 only: Internal Admin Data Model and Seed Script. Add an `INTERNAL_ADMIN` DynamoDB item model using the real user key, implement `requireAdmin` requiring both Auth0 admin scope and active DynamoDB admin item, and add a documented seed script. Do not use a fake/reserved client membership for admins. Do not build admin UI yet. Add tests for scope/item combinations.
```

---

# Phase 29 — Admin Client Index and Backend List Endpoint

## Goal

Add efficient admin client listing by status without scanning the table.

## Involved areas

- Client profile GSI fields.
- Admin list endpoint.
- Status filter query.
- Pagination basics.

## Tasks for Codex

- Ensure CLIENT profile items include `GSI1PK = CLIENT_STATUS#{status}` and `GSI1SK = UPDATED#{updatedAt}#CLIENT#{clientId}`.
- Update bootstrap/client status writes to maintain the index fields.
- Implement `GET /api/admin/clients` requiring admin scope and active INTERNAL_ADMIN item.
- Support status filter and pagination where practical.
- Add tests that the endpoint rejects non-admins and does not scan.

## Resources / files likely touched

- Backend admin handler
- DynamoDB item builders
- Tenant/admin utils
- Shared admin schemas

## Do not do in this phase

- Do not implement admin detail/status change yet.
- Do not scan all table items for client list.
- Do not build admin frontend yet.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if route/scope changes
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Admin can list clients by status through GSI query.
- Non-admins are rejected.
- No table scan is used for the normal list endpoint.

## Specific Codex prompt for this phase

```text
Implement Phase 29 only: Admin Client Index and Backend List Endpoint. Add/maintain CLIENT status GSI fields and implement `GET /api/admin/clients` with status filtering through the index. Require both Auth0 admin scope and active `INTERNAL_ADMIN` item. Do not implement detail/status update or admin UI yet. Add tests for non-admin rejection and no-scan list behavior.
```

---

# Phase 30 — Admin Detail, Status Change, and Project Backend

## Goal

Let admins inspect a client, change lifecycle status, and create basic project records.

## Involved areas

- `GET /api/admin/clients/{clientId}`.
- `PATCH /api/admin/clients/{clientId}/status`.
- `POST /api/admin/clients/{clientId}/projects`.
- Audit events.

## Tasks for Codex

- Implement admin client detail retrieving profile, intake, memberships, projects, recent files/threads/invoices, and recent audit events with safe limits.
- Implement status update with validation and index maintenance.
- Implement project creation with status and audit event.
- Do not allow normal client users to call these routes.
- Add tests for admin status update and invalid transitions if transition rules exist.

## Resources / files likely touched

- Backend admin handler
- DynamoDB repo
- Shared admin schemas
- Audit helper

## Do not do in this phase

- Do not build admin frontend yet.
- Do not return unbounded client partition data.
- Do not allow client-supplied status without validation.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if routes changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Admin detail/status/project backend routes work and are authorized.
- Status changes update client index fields and write audit events.
- Detail route is bounded and safe.

## Specific Codex prompt for this phase

```text
Implement Phase 30 only: Admin Detail, Status Change, and Project Backend. Add admin-only detail, status update, and project creation endpoints. Require both Auth0 admin scope and active `INTERNAL_ADMIN` item. Validate status changes, update GSI status index fields, and write audit events. Keep detail responses bounded. Do not build admin frontend yet. Add backend tests.
```

---

# Phase 31 — Admin Frontend List and Detail Pages

## Goal

Build the admin UI for client lifecycle management using the backend admin endpoints.

## Involved areas

- `/admin/clients` route.
- `/admin/clients/:clientId` route.
- Admin-only token/scope request flow.
- Status changer UI.

## Tasks for Codex

- Add protected admin routes hidden unless the backend feature flags or admin check indicate access.
- Request admin scopes only for admin API calls, not globally for every user session.
- Show client list with status filters.
- Show client detail with intake, profile, projects, and recent activity.
- Allow status change through backend endpoint.
- Display permission denied clearly for non-admins.

## Resources / files likely touched

- Frontend admin routes
- Admin API hooks
- Auth token handling
- Existing styling system

## Do not do in this phase

- Do not bypass backend auth with frontend-only checks.
- Do not request admin scopes globally for all users.
- Do not implement files/messages/billing admin controls yet unless already available.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Existing marketing pages still build
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Admin can list clients, view details, and change status.
- Non-admin sees permission denied, not broken UI.
- Frontend admin visibility is UX only; backend remains authoritative.

## Specific Codex prompt for this phase

```text
Implement Phase 31 only: Admin Frontend List and Detail Pages. Add `/admin/clients` and `/admin/clients/:clientId` pages using the admin backend endpoints. Request admin scopes only for admin calls. Show client list/status filters, detail view, and status changer. Do not bypass backend authorization. Do not implement file/message/billing admin controls yet. Keep marketing pages building.
```

---

# Phase 32 — S3 Upload Bucket Terraform Foundation

## Goal

Create the private upload bucket with browser CORS and safe defaults.

## Human checkpoint

Human must review Terraform plan before apply because this creates persistent file storage resources.

## Involved areas

- S3 bucket `client-portal-uploads-{env}-{account}` or generated equivalent.
- Block public access.
- Encryption, versioning, SSL enforcement.
- Object ownership/ACL disabled when supported.
- CORS for browser PUT/GET/HEAD from approved frontend origins.

## Tasks for Codex

- Add upload bucket Terraform resource with private configuration.
- Add CORS rules for local and production frontend origins.
- Add lifecycle rule for incomplete multipart uploads if applicable.
- Add output or env wiring plan for `UPLOAD_BUCKET`, but do not grant broad access yet.
- Document bucket naming and retention/destroy behavior.

## Resources / files likely touched

- Terraform S3 resources
- Terraform variables
- docs/client-portal/file-upload-flow.md

## Do not do in this phase

- Do not implement presigned URL backend yet.
- Do not make bucket public.
- Do not run Terraform apply without human plan review.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Private encrypted versioned bucket is defined.
- CORS is limited to expected origins.
- Plan is ready for human review.

## Specific Codex prompt for this phase

```text
Implement Phase 32 only: S3 Upload Bucket Terraform Foundation. Add a private encrypted versioned upload bucket with block public access, SSL enforcement, ACLs disabled/object ownership where supported, lifecycle cleanup, and browser CORS for approved origins. Do not implement presigned URL APIs yet. Run terraform fmt/validate and produce a Terraform plan for human review; do not apply.
```

---

# Phase 33 — S3 File Handler IAM and Environment Wiring

## Goal

Give only the file handler the S3 permissions and environment values it needs.

## Human checkpoint

Human must review IAM permissions and Terraform plan before apply.

## Involved areas

- Lambda file handler role.
- S3 PutObject/GetObject/HeadObject/DeleteObject permissions scoped to upload bucket/prefix.
- `UPLOAD_BUCKET` and `MAX_UPLOAD_BYTES` env vars.

## Tasks for Codex

- Add least-privilege S3 permissions for the files handler only.
- Scope object permissions to the upload bucket and object ARNs.
- Add `UPLOAD_BUCKET` and `MAX_UPLOAD_BYTES` env vars.
- Do not grant S3 permissions to identity/intake/admin handlers unless necessary.

## Resources / files likely touched

- Terraform IAM
- Terraform Lambda env vars
- S3 docs

## Do not do in this phase

- Do not implement file API logic yet.
- Do not use broad `s3:*`.
- Do not apply Terraform without plan review.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- File handler has the minimum S3 permissions needed for future presigned URL flow.
- Other handlers do not receive unnecessary S3 permissions.

## Specific Codex prompt for this phase

```text
Implement Phase 33 only: S3 File Handler IAM and Environment Wiring. Add scoped S3 IAM permissions and `UPLOAD_BUCKET`/`MAX_UPLOAD_BYTES` environment variables for the files handler group. Do not implement file APIs yet and do not grant broad `s3:*`. Run terraform fmt/validate and produce a plan for human review; do not apply.
```

---

# Phase 34 — File Safety Utilities and Metadata Model

## Goal

Implement file validation, filename sanitization, blocked extension logic, and metadata item builders.

## Involved areas

- Filename sanitization.
- Blocked extension list.
- MIME/category/size validation.
- File metadata DynamoDB item shape.

## Tasks for Codex

- Implement `sanitizeFilename` and blocked-extension checks for executable/script extensions.
- Implement upload limit helpers using `MAX_UPLOAD_BYTES` defaulting to 50 MB.
- Implement S3 key builder: `clients/{clientId}/projects/{projectId or general}/uploads/{fileId}/{safeFilename}`.
- Implement file metadata item builder and tests.
- Do not generate presigned URLs yet.

## Resources / files likely touched

- Backend/src/files
- DynamoDB item builders
- Shared file schemas
- Backend tests

## Do not do in this phase

- Do not upload files yet.
- Do not allow dangerous extensions for client users.
- Do not process file bytes in Lambda.

## Validation commands / checks

- Backend build
- Backend tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Filename and extension logic is tested.
- S3 key format is deterministic and tenant-scoped.
- File metadata item shape matches the plan.

## Specific Codex prompt for this phase

```text
Implement Phase 34 only: File Safety Utilities and Metadata Model. Add filename sanitization, blocked extension checks, upload limit helpers, S3 key builder, and file metadata item builders with tests. Default max upload size should be 50 MB unless env overrides. Do not implement presigned URL endpoints or frontend upload UI yet.
```

---

# Phase 35 — File Presigned Upload Backend

## Goal

Implement upload URL creation and completion verification for browser-to-S3 uploads.

## Involved areas

- `POST /api/files/presign-upload`.
- `POST /api/files/{fileId}/complete`.
- DynamoDB pending/uploaded status updates.
- S3 presigned PUT and HeadObject verification.

## Tasks for Codex

- Require auth and `write:files` scope where configured.
- Allow upload only for eligible statuses such as active/maintenance or admins.
- Validate filename, MIME, category, projectId, and declared size.
- Create FILE metadata item with `uploadStatus = pending`.
- Return short-lived presigned PUT URL and required headers.
- Complete endpoint must verify object exists with HeadObject and validate object size/key before marking uploaded.
- Write audit events.
- Add handler tests for dangerous extension rejection and tenant isolation.

## Resources / files likely touched

- Backend files handler
- S3 client/presigner
- DynamoDB repo
- Audit helper

## Do not do in this phase

- Do not receive file bytes through Lambda.
- Do not implement frontend UI yet.
- Do not allow lead users to upload files unless feature flags explicitly allow it.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if routes/scopes changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Presigned upload flow works backend-side.
- Complete endpoint verifies S3 object with HeadObject.
- Dangerous files are rejected before presign for clients.

## Specific Codex prompt for this phase

```text
Implement Phase 35 only: File Presigned Upload Backend. Add `POST /api/files/presign-upload` and `POST /api/files/{fileId}/complete`. Use tenant resolution, feature/status checks, shared validation, file safety utilities, DynamoDB metadata, short-lived S3 presigned PUT URLs, and HeadObject verification on completion. Lambda must not receive file bytes. Add backend tests for blocked extensions, status eligibility, and tenant isolation. Do not build frontend upload UI yet.
```

---

# Phase 36 — File List, Download URL, and Soft Delete Backend

## Goal

Add backend file browsing and download/delete operations with tenant checks.

## Involved areas

- `GET /api/files`.
- `GET /api/files/{fileId}/download-url`.
- `DELETE /api/files/{fileId}`.
- Presigned GET URLs.

## Tasks for Codex

- List files for the authenticated user's client with optional category/project filters.
- Get file by `fileId` through GSI2 and verify it belongs to the user's client.
- Generate short-lived presigned GET URLs for allowed statuses.
- Soft-delete files by setting `uploadStatus = deleted`; only optionally delete S3 object for admin if designed.
- Write audit events for download URL creation if desired and delete actions.
- Add tests for cross-client access denial.

## Resources / files likely touched

- Backend files handler
- DynamoDB repo
- S3 presigner
- Shared file schemas

## Do not do in this phase

- Do not implement frontend UI yet.
- Do not return raw S3 keys as authorization.
- Do not allow download of deleted/quarantined files unless explicitly designed for admins.

## Validation commands / checks

- Backend build
- Backend tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Client can list own files.
- Client cannot access another client's file.
- Download URLs are short-lived and authorized.

## Specific Codex prompt for this phase

```text
Implement Phase 36 only: File List, Download URL, and Soft Delete Backend. Add authenticated file listing, download-url, and soft-delete endpoints. Verify file ownership through DynamoDB metadata before generating presigned GET URLs. Reject cross-client access. Do not build frontend UI yet. Add backend tests for tenant isolation and deleted/quarantined behavior.
```

---

# Phase 37 — File Upload Frontend

## Goal

Build the browser-to-S3 file upload interface for active clients.

## Involved areas

- `/files` route.
- File upload panel.
- File list and download buttons.
- Category/project selection.

## Tasks for Codex

- Add protected `/files` route gated by backend feature flags/status.
- Build upload form with category selection, optional project selection, allowed file type/size messaging, and no-secrets warning.
- Call presign endpoint, PUT file directly to S3, then call complete endpoint.
- Show upload progress if practical.
- List files and create download URLs on demand.
- Do not send file bytes through the Lambda API.

## Resources / files likely touched

- Frontend files feature
- API hooks
- Dashboard links
- Existing styling

## Do not do in this phase

- Do not implement messages yet.
- Do not implement billing yet.
- Do not bypass backend feature flags.
- Do not hardcode S3 credentials or bucket details in frontend.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Manual upload smoke test if env is available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Active/maintenance clients can upload files directly to S3 through presigned URLs.
- File list and download flow work through backend authorization.
- Lead users do not see upload UI unless backend flags allow it.

## Specific Codex prompt for this phase

```text
Implement Phase 37 only: File Upload Frontend. Add `/files` UI that uses the backend presign/upload/complete/list/download endpoints. Browser must PUT directly to S3 and then call complete; Lambda must never receive file bytes. Gate UI with backend feature flags and status. Show no-secrets warning and allowed size/type guidance. Do not implement messages or billing yet. Run frontend build/typecheck.
```

---

# Phase 38 — Messages Backend

## Goal

Add portal-native message threads and replies as the canonical communication record.

## Involved areas

- `GET /api/threads`.
- `POST /api/threads`.
- `GET /api/threads/{threadId}/messages`.
- `POST /api/threads/{threadId}/messages`.
- Thread/message DynamoDB items and audit events.

## Tasks for Codex

- Require auth and message scopes where configured.
- Resolve client context and enforce thread ownership.
- Create thread metadata under client partition and messages under `THREAD#{threadId}` partition.
- Keep body plain text or sanitized markdown only; no raw HTML injection.
- Update thread preview/lastMessageAt on reply.
- Set email notification status to `not_sent` for now; SES comes later.
- Add tests for create thread, reply, cross-client denial, and preview update.

## Resources / files likely touched

- Backend messages handler
- DynamoDB item builders
- Shared message schemas
- Audit helper

## Do not do in this phase

- Do not implement SES email yet.
- Do not implement frontend messages yet.
- Do not implement reply-by-email.
- Do not store raw HTML.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if routes changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Messages backend works as canonical portal communication.
- Cross-client access is denied.
- No email delivery is attempted yet.

## Specific Codex prompt for this phase

```text
Implement Phase 38 only: Messages Backend. Add authenticated thread and message endpoints. Store thread metadata under the client partition and messages under the thread partition. Enforce tenant ownership, keep message content plain text or sanitized markdown, write audit events, and set email notification status to `not_sent`. Do not add SES or frontend UI yet. Add backend tests.
```

---

# Phase 39 — Messages Frontend

## Goal

Build the client-facing message UI using portal-native message endpoints.

## Involved areas

- `/messages` route.
- `/messages/:threadId` route.
- Thread list, thread view, composer, new thread form.

## Tasks for Codex

- Add protected messages routes gated by backend feature flags.
- Display thread list with loading/error/empty states.
- Display messages in a thread and allow replies.
- Create new thread with first message.
- Keep message input plain text or sanitized markdown.
- Do not implement reply-by-email.

## Resources / files likely touched

- Frontend messages feature
- API hooks
- Dashboard links
- Existing styling

## Do not do in this phase

- Do not add SES notification behavior in frontend.
- Do not render raw HTML from messages.
- Do not implement billing yet.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Client can create threads and reply in the portal.
- Messages are visible in dashboard/messages route.
- Feature flags control UI visibility, backend controls authorization.

## Specific Codex prompt for this phase

```text
Implement Phase 39 only: Messages Frontend. Add protected `/messages` and `/messages/:threadId` pages with thread list, new-thread form, thread view, and reply composer. Use the backend message endpoints and backend feature flags. Keep message content plain text or sanitized markdown and never render raw HTML. Do not implement SES or billing yet. Run frontend build/typecheck.
```

---

# Phase 40 — SES Notification Scaffold

## Goal

Add optional email notifications for portal messages without making email the source of truth.

## Human checkpoint

Human must review any SES IAM/env Terraform plan before apply.

## Involved areas

- `SES_FROM_EMAIL` env var.
- SES SendEmail IAM only for messages handler if configured.
- Email notification service.
- Message notification status updates.

## Tasks for Codex

- Add optional SES email notification service.
- If `SES_FROM_EMAIL` is absent, do not send email and keep status `not_sent`.
- If configured, send simple notification linking back to the dashboard/thread.
- Update message `emailNotificationStatus` to sent/failed.
- Document SES sandbox limitations and production access requirement.
- Do not implement inbound email or reply-by-email.

## Resources / files likely touched

- Backend notification service
- Terraform SES IAM/env
- docs/client-portal/email-notifications.md

## Do not do in this phase

- Do not make email canonical.
- Do not implement reply-by-email.
- Do not fail message creation just because email sending fails unless explicitly desired.
- Do not apply Terraform without human plan review if IAM/env changes are needed.

## Validation commands / checks

- Backend build
- Backend tests
- terraform fmt/validate/plan if IAM/env changed
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- SES notifications are optional and safely disabled by default.
- Message records remain canonical.
- SES behavior is documented.

## Specific Codex prompt for this phase

```text
Implement Phase 40 only: SES Notification Scaffold. Add an optional SES notification service for new portal messages. If `SES_FROM_EMAIL` is absent, do not send email and mark/leave notification status as `not_sent`. If configured, send a simple email with a link back to the portal thread and mark sent/failed. Do not implement reply-by-email. Add docs for SES sandbox/production access. If Terraform IAM/env changes are needed, produce a plan for human review and do not apply.
```

---

# Phase 41 — Billing Backend Scaffold

## Goal

Add invoice metadata retrieval and a safe Stripe portal endpoint that returns 501 when unconfigured.

## Involved areas

- `GET /api/billing`.
- `POST /api/billing/stripe-portal-session`.
- Invoice metadata queries.
- Optional Stripe SDK/config.

## Tasks for Codex

- Implement billing endpoints requiring auth and `read:billing` where configured.
- Return invoice metadata from DynamoDB for the authenticated client's partition.
- If `STRIPE_SECRET_KEY` is missing, `stripe-portal-session` returns 501 with a clear message.
- If configured, create a Stripe customer portal session using the client's `stripeCustomerId`.
- Do not store payment card data.
- Add tests for 501 fallback and tenant isolation.

## Resources / files likely touched

- Backend billing handler
- Shared billing schemas
- DynamoDB repo
- Stripe optional dependency/config

## Do not do in this phase

- Do not implement frontend billing yet.
- Do not store card/payment method data.
- Do not make Stripe key required for local dev.

## Validation commands / checks

- Backend build
- Backend tests
- Terraform plan if env/route changes
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Billing metadata route works.
- Stripe portal endpoint safely returns 501 when not configured.
- Tenant isolation is enforced.

## Specific Codex prompt for this phase

```text
Implement Phase 41 only: Billing Backend Scaffold. Add authenticated `GET /api/billing` and `POST /api/billing/stripe-portal-session`. Return invoice metadata from DynamoDB. If `STRIPE_SECRET_KEY` is absent, return 501 with a clear message; if present, create a Stripe customer portal session using the client's Stripe customer ID. Do not store payment card data. Add backend tests for 501 fallback and tenant isolation.
```

---

# Phase 42 — Billing Frontend Scaffold

## Goal

Build a client billing page that displays invoice metadata and links to Stripe only when available.

## Involved areas

- `/billing` route.
- Billing panel/invoice list.
- Stripe portal button.
- 501 fallback UX.

## Tasks for Codex

- Add protected `/billing` route gated by backend feature flags.
- Display invoice metadata from `GET /api/billing`.
- Add button that calls `POST /api/billing/stripe-portal-session` and redirects if a URL is returned.
- Show a clear disabled/unconfigured message when backend returns 501.
- Do not collect payment details in the app.

## Resources / files likely touched

- Frontend billing feature
- API hooks
- Dashboard links
- Existing styling

## Do not do in this phase

- Do not build custom payment forms.
- Do not store card details.
- Do not hardcode Stripe keys in frontend.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Billing page shows invoices and handles unconfigured Stripe gracefully.
- No payment details are collected by the app.
- Feature flags control UI visibility.

## Specific Codex prompt for this phase

```text
Implement Phase 42 only: Billing Frontend Scaffold. Add a protected `/billing` page that displays invoice metadata from the backend and offers a Stripe portal button. If the backend returns 501 because Stripe is not configured, show a clear unconfigured message. Do not build payment forms or store card details. Run frontend build/typecheck.
```

---

# Phase 43 — Structured Logging, Request IDs, and Error Consistency

## Goal

Standardize operational logging and error response behavior across Lambda handlers.

## Involved areas

- Backend logger utility.
- Request/correlation IDs.
- Error response shape.
- Private response headers.

## Tasks for Codex

- Ensure every handler uses structured JSON logs.
- Ensure requestId/correlationId appears in logs and error responses.
- Ensure private API responses use `Cache-Control: no-store`.
- Add or update tests for error response shape.
- Avoid logging secrets, tokens, presigned URLs, or sensitive intake contents unnecessarily.

## Resources / files likely touched

- Backend logger/response utilities
- All backend handlers
- Backend tests

## Do not do in this phase

- Do not add CloudWatch alarms yet.
- Do not log Auth0 tokens or secret values.
- Do not alter business behavior beyond response/log consistency.

## Validation commands / checks

- Backend build
- Backend tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Handlers produce consistent logs and responses.
- Errors include requestId.
- Private responses include no-store.

## Specific Codex prompt for this phase

```text
Implement Phase 43 only: Structured Logging, Request IDs, and Error Consistency. Standardize backend structured JSON logging, requestId/correlationId propagation, no-store private responses, and error response shapes across handlers. Do not log tokens, secrets, presigned URLs, or sensitive user data. Add tests for error response format. Do not add CloudWatch alarms or WAF yet.
```

---

# Phase 44 — CloudWatch Log Retention and Alarms

## Goal

Add basic production observability resources through Terraform.

## Human checkpoint

Human must review observability Terraform plan before apply.

## Involved areas

- Lambda log groups/log retention.
- API Gateway metrics/alarms.
- Lambda error/latency alarms.
- Optional SNS alarm topic if the repo already supports it or can be safely added.

## Tasks for Codex

- Define CloudWatch log retention for Lambda log groups.
- Add alarms for Lambda errors and high duration where practical.
- Add alarms or metrics for API Gateway 4xx/5xx and latency where practical.
- Document any alarms deferred due to missing notification targets.
- Do not make noisy alarms without configurable thresholds.

## Resources / files likely touched

- Terraform CloudWatch resources
- Terraform variables
- docs/client-portal/observability.md

## Do not do in this phase

- Do not implement WAF in this phase.
- Do not apply Terraform without human plan review.
- Do not create hardcoded personal email/SNS targets.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Log retention and useful alarms are defined or clearly documented as deferred.
- Thresholds are configurable where appropriate.
- Plan is ready for human review.

## Specific Codex prompt for this phase

```text
Implement Phase 44 only: CloudWatch Log Retention and Alarms. Add Terraform-managed log retention and basic CloudWatch alarms for Lambda/API Gateway errors, latency, and high duration where practical. Use configurable thresholds and avoid hardcoded personal notification targets. Document deferred alarm wiring if needed. Run terraform fmt/validate and produce a plan for human review; do not apply.
```

---

# Phase 45 — AWS WAF Rate Limiting for CloudFront `/api/*`

## Goal

Add rate-based abuse protection for the portal API at CloudFront.

## Human checkpoint

Human must review CloudFront/WAF Terraform plan before apply, especially due to prior CloudFront drift issues.

## Involved areas

- AWS WAF WebACL attached to CloudFront.
- Rate-based rules for `/api/*`.
- Stricter patterns for presigned upload and messages if feasible.
- Terraform variables for thresholds/enabled state.

## Tasks for Codex

- Add WAF WebACL/rate-based rules if compatible with the existing Terraform/CloudFront setup.
- Apply to CloudFront distribution with an enable/disable variable if needed.
- Add a general `/api/*` rate rule and stricter rules for upload presign/messages if practical.
- Document any limitations due to CloudFront/WAF scope requirements.
- Do not block legitimate local/dev workflows without configurable thresholds.

## Resources / files likely touched

- Terraform WAF resources
- CloudFront distribution
- docs/client-portal/security.md

## Do not do in this phase

- Do not apply Terraform without careful human plan review.
- Do not hardcode overly aggressive production thresholds.
- Do not implement app-level feature logic in WAF phase.

## Validation commands / checks

- terraform fmt -check
- terraform validate
- terraform plan for review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- WAF/rate limiting is implemented or documented as a clear follow-up if not feasible.
- Thresholds are configurable.
- CloudFront plan is reviewed carefully for unrelated drift.

## Specific Codex prompt for this phase

```text
Implement Phase 45 only: AWS WAF Rate Limiting for CloudFront `/api/*`. Add Terraform WAF rate-based protections for API routes, with configurable thresholds and optional stricter rules for upload presign and messages. Attach to CloudFront if compatible with the existing setup. Do not apply Terraform. Produce a plan for human review and call out any CloudFront drift or WAF limitations.
```

---

# Phase 46 — Backend Test Expansion and Tenant Isolation Regression Suite

## Goal

Consolidate backend tests around the most important security behavior.

## Involved areas

- Tenant isolation tests.
- Status transition tests.
- File access tests.
- Admin authorization tests.
- Billing/message tests.

## Tasks for Codex

- Add or organize backend tests for `/api/me`, intake status transition, client cannot access another client's file/thread/invoice, admin scope+item requirement, and file dangerous extension rejection.
- Mock AWS clients cleanly; do not require real AWS for unit tests unless repo already uses integration tests.
- Ensure tests can run in CI.
- Add test docs if needed.

## Resources / files likely touched

- Backend tests
- Test utilities/mocks
- Shared test fixtures

## Do not do in this phase

- Do not add new feature endpoints.
- Do not make tests depend on production resources.
- Do not weaken auth logic to make tests pass.

## Validation commands / checks

- Backend tests
- Backend build
- Shared tests
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Core security/tenant tests pass.
- Test fixtures are reusable.
- CI can run tests without real AWS credentials unless integration mode is explicit.

## Specific Codex prompt for this phase

```text
Implement Phase 46 only: Backend Test Expansion and Tenant Isolation Regression Suite. Add/organize tests for `/api/me`, intake lead→intake_submitted, cross-client file/thread/invoice denial, admin scope+INTERNAL_ADMIN requirement, and blocked file extensions. Use mocks/fixtures rather than real AWS unless the repo already has integration tests. Do not add feature scope. Run backend/shared tests.
```

---

# Phase 47 — Frontend Build, Typecheck, and Route Regression Suite

## Goal

Add frontend validation around protected routes and the portal app shell.

## Involved areas

- Frontend typecheck/build scripts.
- Protected route tests if frontend test framework exists.
- Smoke tests for dashboard/intake/files/messages/billing/admin route rendering if practical.
- Marketing page build preservation.

## Tasks for Codex

- Ensure frontend build and typecheck scripts are present and reliable.
- Add lightweight tests for API client error handling, ProtectedRoute behavior, and feature-gated rendering if test framework exists.
- Ensure marketing pages continue building after portal routes are added.
- Document any frontend tests deferred due to missing test framework.

## Resources / files likely touched

- Frontend package scripts
- Frontend tests
- Frontend docs

## Do not do in this phase

- Do not add new portal features.
- Do not rewrite existing marketing pages.
- Do not introduce a heavy new test framework if the repo has a clear alternative unless justified.

## Validation commands / checks

- Frontend build
- Frontend typecheck
- Frontend tests if available
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Frontend validation commands are stable.
- Protected route/API client basics are covered or documented.
- Marketing pages still build.

## Specific Codex prompt for this phase

```text
Implement Phase 47 only: Frontend Build, Typecheck, and Route Regression Suite. Strengthen frontend validation scripts and add lightweight tests for ProtectedRoute, API client error handling, and feature-gated route rendering if the repo has or can safely add a test setup. Ensure existing marketing pages still build. Do not add new feature scope or rewrite marketing pages.
```

---

# Phase 48 — CI Validation Hardening

## Goal

Update CI/release validation to run the frontend, backend, shared, and Terraform checks in the right order.

## Involved areas

- CI workflow files.
- Packaging script.
- Shared/backend/frontend builds.
- Terraform fmt/validate.

## Tasks for Codex

- Update CI to run shared build/tests, backend build/tests, frontend build/typecheck, and Terraform fmt/validate.
- Ensure artifact packaging still runs and produces expected Lambda/frontend artifacts.
- Make CI fail on meaningful errors but not require unavailable secrets for normal PR validation.
- Document CI commands for local reproduction.

## Resources / files likely touched

- CI workflow files
- scripts/cicd
- package scripts
- README/docs

## Do not do in this phase

- Do not run Terraform apply in CI for normal validation.
- Do not require real Auth0/Stripe/SES secrets for build/test.
- Do not skip frontend marketing build.

## Validation commands / checks

- Run local equivalent of CI commands
- Package artifact check
- Terraform fmt/validate
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- CI covers shared/backend/frontend/Terraform validation.
- No real secrets are required for PR validation.
- Artifact packaging supports the Node backend.

## Specific Codex prompt for this phase

```text
Implement Phase 48 only: CI Validation Hardening. Update CI and packaging validation so shared tests/build, backend tests/build, frontend build/typecheck, artifact packaging, and Terraform fmt/validate run in a sensible order. Do not run Terraform apply in CI and do not require real Auth0/Stripe/SES secrets for PR validation. Preserve marketing page build validation.
```

---

# Phase 49 — Documentation and Runbooks

## Goal

Create repo-ready documentation for future Codex runs and human deployment/testing.

## Involved areas

- README updates.
- Architecture doc.
- Auth0 setup doc.
- Terraform deployment doc.
- File upload flow doc.
- DynamoDB item model doc.
- Admin seeding runbook.

## Tasks for Codex

- Update README with required env vars and local commands.
- Create/update `docs/client-portal/architecture.md`.
- Create/update `docs/client-portal/auth0-setup.md` including callback/logout/web origins, API audience, RBAC, scopes, and admin scopes.
- Create/update `docs/client-portal/terraform-deployment.md` including plan-review rule and data-destroy safeguards.
- Create/update file upload, DynamoDB item model, admin seeding, observability, and troubleshooting docs.
- Ensure this phase plan itself is referenced from docs if stored in repo.

## Resources / files likely touched

- README.md
- docs/client-portal/*
- Terraform variable docs
- Env examples

## Do not do in this phase

- Do not add new feature implementation.
- Do not include real secrets or account IDs unless already public/non-sensitive.
- Do not contradict the implemented repo structure.

## Validation commands / checks

- Docs lint if available
- Frontend/backend builds if docs changes affect package files
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- Future Codex runs can understand architecture and setup without guessing.
- Human deployment steps are clear and include Terraform plan review.
- Auth0/Admin/File/DynamoDB behavior is documented.

## Specific Codex prompt for this phase

```text
Implement Phase 49 only: Documentation and Runbooks. Update README and `docs/client-portal/*` with architecture, Auth0 setup, Terraform deployment, DynamoDB item model, file upload flow, admin seeding, observability, CI, and troubleshooting guidance. Include the rule that Terraform plans must be reviewed before apply for infra phases. Do not add feature code. Do not include real secrets.
```

---

# Phase 50 — Final Integration and Manual Acceptance Matrix

## Goal

Run the full MVP validation matrix, clean up temporary code, and prepare the repo for future feature work.

## Human checkpoint

Human must review final Terraform plan and any legacy-code deletion before applying/deleting.

## Involved areas

- End-to-end manual test checklist.
- Cleanup of obsolete placeholders and deprecated .NET Lambda if fully replaced.
- Final builds/tests/Terraform validation.
- Known issues and deferred work list.

## Tasks for Codex

- Run or document the manual acceptance matrix: new lead, intake submission, admin status change, active client upload, messages, billing 501 fallback, unauthorized access cases.
- Remove obsolete placeholders only if they are truly no longer referenced.
- Remove or archive the .NET health Lambda only if the Node replacement is fully deployed and documented.
- Ensure no AWS credentials, Auth0 secrets, Stripe keys, or SES secrets are committed.
- Produce final summary and deferred backlog.

## Resources / files likely touched

- All app areas
- Docs
- CI/scripts
- Terraform validation

## Do not do in this phase

- Do not add new features.
- Do not delete legacy code unless it is confirmed unused and rollback is documented.
- Do not run Terraform apply without explicit human instruction.

## Validation commands / checks

- Shared build/tests
- Backend build/tests
- Frontend build/typecheck/tests
- Terraform fmt/validate
- Terraform plan for final review
- Use the repository's actual commands when they differ from examples.
- Do not skip validation silently. If a command cannot run, explain why and what would need to change.
- End with a phase summary: files changed, commands run, tests passing/failing, assumptions, and deferred work.

## Acceptance criteria

- The MVP foundation is buildable, testable, and documented.
- Manual acceptance matrix is completed or gaps are documented.
- Future work is clearly listed without blocking the foundation.

## Specific Codex prompt for this phase

```text
Implement Phase 50 only: Final Integration and Manual Acceptance Matrix. Run the full validation matrix for new lead, intake, admin status change, active file upload, messages, billing fallback, and unauthorized access cases. Clean up only confirmed-unused placeholders or legacy code, document rollback/deferred work, and run all available build/test/Terraform validation commands. Do not add new feature scope and do not apply Terraform unless explicitly instructed.
```

---


# Appendix A — API Route Matrix

| Route | Method | Auth | Suggested Scope | Backend Check | Phase |
|---|---:|---|---|---|---:|
| `/api/health` | GET | Public | none | none | 9 |
| `/api/me` | GET | Required | `read:me` | bootstrap or active membership | 18 |
| `/api/dashboard` | GET | Required | `read:client` | active membership | 26 |
| `/api/intake` | GET | Required | `read:client` | active membership | 23 |
| `/api/intake` | PUT | Required | `write:intake` | active membership | 23 |
| `/api/client/profile` | PATCH | Required | `write:client` | active membership | 23 |
| `/api/admin/clients` | GET | Required | `admin:clients` | active `INTERNAL_ADMIN` item | 29 |
| `/api/admin/clients/{clientId}` | GET | Required | `admin:clients` | active `INTERNAL_ADMIN` item | 30 |
| `/api/admin/clients/{clientId}/status` | PATCH | Required | `admin:clients` | active `INTERNAL_ADMIN` item | 30 |
| `/api/admin/clients/{clientId}/projects` | POST | Required | `admin:clients` | active `INTERNAL_ADMIN` item | 30 |
| `/api/files/presign-upload` | POST | Required | `write:files` | active membership + eligible status | 35 |
| `/api/files/{fileId}/complete` | POST | Required | `write:files` | file belongs to client | 35 |
| `/api/files` | GET | Required | `read:files` | active membership | 36 |
| `/api/files/{fileId}/download-url` | GET | Required | `read:files` | file belongs to client | 36 |
| `/api/files/{fileId}` | DELETE | Required | `write:files` | file belongs to client | 36 |
| `/api/threads` | GET | Required | `read:messages` | active membership | 38 |
| `/api/threads` | POST | Required | `write:messages` | active membership + feature flag | 38 |
| `/api/threads/{threadId}/messages` | GET | Required | `read:messages` | thread belongs to client | 38 |
| `/api/threads/{threadId}/messages` | POST | Required | `write:messages` | thread belongs to client | 38 |
| `/api/billing` | GET | Required | `read:billing` | active membership | 41 |
| `/api/billing/stripe-portal-session` | POST | Required | `read:billing` | active membership + Stripe configured or 501 fallback | 41 |

API Gateway route scopes should use specific route scopes. Remember that API Gateway scope matching is not a substitute for backend role logic. Backend checks remain mandatory.

---

# Appendix B — Environment Variables

## Frontend

```text
VITE_AUTH0_DOMAIN
VITE_AUTH0_CLIENT_ID
VITE_AUTH0_AUDIENCE
VITE_API_BASE_URL
```

## Backend Lambda

```text
CLIENT_PORTAL_TABLE
UPLOAD_BUCKET
AUTH0_DOMAIN
AUTH0_AUDIENCE
MAX_UPLOAD_BYTES
SES_FROM_EMAIL optional
STRIPE_SECRET_KEY optional
APP_BASE_URL
NODE_ENV or ENVIRONMENT
```

## Terraform

```text
environment
auth0_domain
auth0_audience
frontend_allowed_origins
allow_data_resource_destroy
max_upload_bytes
ses_from_email optional
stripe_secret_config optional, depending on secret management model
waf_enabled optional
waf_api_rate_limit optional
```

Do not put real secret values in committed Terraform variable files or frontend env files.

---

# Appendix C — DynamoDB Item Model

## Client profile

```text
PK = CLIENT#{clientId}
SK = PROFILE#
type = CLIENT
clientId
businessName
status = lead | intake_submitted | qualified | proposal_sent | contract_sent | active | maintenance | archived
primaryContactUserId
GSI1PK = CLIENT_STATUS#{status}
GSI1SK = UPDATED#{updatedAt}#CLIENT#{clientId}
createdAt
updatedAt
```

## User profile

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

## Internal admin

```text
PK = USER#{auth0Sub}
SK = ADMIN#PROFILE
type = INTERNAL_ADMIN
status = active | inactive
createdAt
createdBy
updatedAt
```

Do not model admins as members of a fake client.

## Current intake

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

## File metadata

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
category
uploadStatus = pending | uploaded | clean | quarantined | deleted
uploadedBy
createdAt
updatedAt
```

## Thread metadata

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

## Audit event

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

---

# Appendix D — DynamoDB Access Patterns

| Access Pattern | Method |
|---|---|
| Get client profile | `GetItem PK=CLIENT#{clientId}, SK=PROFILE#` |
| Get user profile | `GetItem PK=USER#{auth0Sub}, SK=PROFILE#` |
| Get user's client memberships | `Query GSI1PK=USER#{auth0Sub}` |
| Check internal admin | `GetItem PK=USER#{auth0Sub}, SK=ADMIN#PROFILE` |
| Get current intake | `GetItem PK=CLIENT#{clientId}, SK=INTAKE#CURRENT` |
| Get projects for client | `Query PK=CLIENT#{clientId}, SK begins_with PROJECT#` |
| Get recent files for client | `Query PK=CLIENT#{clientId}, SK begins_with FILE#` |
| Get files for project | `Query GSI1PK=PROJECT#{projectId}, GSI1SK begins_with FILE#` |
| Get file by fileId | `Query GSI2PK=FILE#{fileId}` |
| Get threads for client | `Query PK=CLIENT#{clientId}, SK begins_with THREAD#` |
| Get messages in thread | `Query PK=THREAD#{threadId}, SK begins_with MESSAGE#` |
| Get invoices for client | `Query PK=CLIENT#{clientId}, SK begins_with INVOICE#` |
| Get audit events for client | `Query PK=CLIENT#{clientId}, SK begins_with AUDIT#` |
| Admin list clients by status | `Query GSI1PK=CLIENT_STATUS#{status}` |

---

# Appendix E — Feature Flags by Status

| Status | canEditIntake | canUploadFiles | canViewBilling | canSendMessages | canViewProjects | Mode |
|---|---:|---:|---:|---:|---:|---|
| `lead` | yes | no | no | optional no | no | intake onboarding |
| `intake_submitted` | yes | no | no | optional no | no | review pending |
| `qualified` | yes | no | no | yes | optional no | discovery/proposal |
| `proposal_sent` | yes | no | no | yes | optional no | proposal review |
| `contract_sent` | limited yes | optional no | optional yes | yes | optional yes | contract/deposit |
| `active` | limited yes | yes | yes | yes | yes | project delivery |
| `maintenance` | limited/no | yes/limited | yes | yes | yes | support/hosting |
| `archived` | no | no | yes/read-only | no/limited | yes/read-only | history |

Backend feature flags drive dashboard behavior. Frontend feature flags are UX controls only, not authorization.

---

# Appendix F — Suggested Backend Utility Layout

Adapt names to the existing repo. Do not rename the top-level `Backend` folder.

```text
Backend/src/
├── shared/
│   ├── auth.ts
│   ├── response.ts
│   ├── validation.ts
│   ├── ids.ts
│   ├── time.ts
│   └── logger.ts
├── dynamodb/
│   ├── client.ts
│   ├── keys.ts
│   ├── items.ts
│   ├── repository.ts
│   └── audit.ts
├── tenant/
│   ├── resolveClientContext.ts
│   ├── requireAdmin.ts
│   └── featureFlags.ts
├── handlers/
│   ├── health.ts
│   ├── identityIntake.ts
│   ├── files.ts
│   ├── messages.ts
│   ├── billing.ts
│   └── admin.ts
├── files/
│   ├── sanitizeFilename.ts
│   ├── blockedExtensions.ts
│   ├── s3.ts
│   └── limits.ts
└── test/
```

---

# Appendix G — Suggested Frontend Layout

Adapt names to the existing repo. Do not rename the top-level `Frontend` folder.

```text
Frontend/src/
├── auth/
│   ├── AppAuthProvider.tsx
│   ├── ProtectedRoute.tsx
│   └── useAccessToken.ts
├── api/
│   ├── client.ts
│   ├── queries.ts
│   └── errors.ts
├── routes/
│   ├── CallbackPage.tsx
│   ├── DashboardPage.tsx
│   ├── IntakePage.tsx
│   ├── FilesPage.tsx
│   ├── MessagesPage.tsx
│   ├── MessageThreadPage.tsx
│   ├── BillingPage.tsx
│   └── admin/
│       ├── AdminClientsPage.tsx
│       └── AdminClientDetailPage.tsx
├── components/
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   ├── PermissionDeniedState.tsx
│   ├── ClientStatusBadge.tsx
│   └── FeatureGate.tsx
├── features/
│   ├── dashboard/
│   ├── intake/
│   ├── files/
│   ├── messages/
│   ├── billing/
│   └── admin/
└── main.tsx
```

---

# Appendix H — Manual Acceptance Matrix

## New lead user

```text
Login with Auth0
/api/me creates USER, CLIENT, MEMBERSHIP
Dashboard shows lead state
Intake can be completed
Status becomes intake_submitted
Uploads hidden
Billing hidden
```

## Admin user

```text
Login with admin scope
Has INTERNAL_ADMIN DynamoDB item
Can view admin client list
Can open client detail
Can change status to active
Dashboard feature flags update for client
```

## Active client

```text
Dashboard shows active modules
File upload UI available
Presigned upload succeeds
Complete endpoint marks file uploaded
Download URL works
Message thread can be created
Billing page loads scaffold
Stripe portal returns 501 if unconfigured
```

## Unauthorized access

```text
No token rejected
Wrong audience rejected
Missing scope rejected by route or backend
Client cannot access another client's file/thread/invoice
Admin without DynamoDB admin item rejected
Admin item without Auth0 scope rejected
/api/* private responses are not cached
```

---

# Appendix I — MVP Completion Definition

The MVP foundation is complete when:

```text
A new Auth0 user can log in.
/api/me creates USER, CLIENT, and MEMBERSHIP.
The user can complete and edit intake.
The dashboard reflects lifecycle status.
An internal admin can be seeded and authenticated.
Admin can change client status.
Active clients can upload files directly to S3.
Files are listed and downloadable through presigned URLs.
Clients can use portal messages.
Billing page exists and safely scaffolds Stripe.
Terraform owns all infrastructure.
CloudFront /api/* does not cache private responses.
DynamoDB PITR is enabled.
S3 upload bucket is private and CORS-enabled.
Tests cover core tenant isolation and status behavior.
Docs explain local development, Auth0 setup, Terraform deployment, and admin seeding.
```
