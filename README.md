# Repeatable Client Website Scaffold

This folder is intended to be copied into a new client repository after the
basic frontend/backend folder structure exists.

## Apopto Client Portal MVP

This repository now also contains the production-oriented client portal MVP
foundation. The portal keeps the existing top-level folder shape:

```text
Frontend/   React/Vite marketing site and authenticated portal screens
Backend/    TypeScript Lambda handlers plus the legacy .NET health project
Shared/     Shared TypeScript/Zod schemas used by frontend and backend
Terraform/  Bootstrap and App infrastructure roots
scripts/    CI/CD validation, packaging, and deployment scripts
```

Start with the client portal documentation index:

```text
docs/client-portal/README.md
```

Key runbooks:

- Architecture and route ownership: `docs/client-portal/README.md`
- Auth0 setup: `docs/client-portal/auth0-setup.md`
- Terraform deployment: `docs/client-portal/terraform-deployment.md`
- DynamoDB item model: `docs/client-portal/dynamodb-item-model.md`
- File upload and GuardDuty flow: `docs/client-portal/file-upload-flow.md`
- Internal admin seeding: `docs/client-portal/internal-admin-seeding.md`
- Observability: `docs/client-portal/cloudwatch-observability.md`
- CI validation: `docs/client-portal/ci-validation.md`
- Final acceptance matrix: `docs/client-portal/final-acceptance-matrix.md`
- Final validation report: `docs/client-portal/final-validation-report.md`
- Troubleshooting: `docs/client-portal/troubleshooting.md`

Infrastructure phases must stop at a Terraform plan for human review unless an
operator explicitly approves apply. Do not commit real Auth0, Stripe, SES, or
AWS secrets; use environment variables, GitHub Actions variables/secrets, SSM,
or local untracked tfvars files.

Recommended client repo shape:

```text
Company/
  .github/
    workflows/
  Frontend/
  Backend/
  Terraform/
    Bootstrap/
    App/
  scripts/
    cicd/
```

`Bootstrap` runs first from an admin-capable AWS session. It creates Terraform
remote state, the GitHub OIDC provider, a staging/site deploy role, and a
production deploy role that is assumed from the staging role.

`App` is applied once per environment using the same release pattern as the
reference Xavier site:

- staging uses `Terraform/App/backends/staging.hcl` and `Terraform/App/environments/staging.tfvars`
- production uses `Terraform/App/backends/production.hcl` and `Terraform/App/environments/production.tfvars`

The deploy scripts build SSR frontend assets, stage public site files under
`Terraform/App/.artifacts/site`, stage private renderer files under
`Terraform/App/.artifacts/site-renderer`, and let Terraform transfer changed S3
objects. Backend packaging builds the TypeScript portal API artifact and still
produces the legacy `.NET` zip as a rollback artifact. Set
`BACKEND_PUBLISH_PROJECT_PATH` in a workflow if a client repo needs an explicit
legacy project path.

## Client Setup Flow

1. Create the new AWS Organization account named after the client.
2. Switch into the account with the admin role.
3. Use temporary/admin AWS CLI credentials locally for setup.
4. Create the GitHub repository named after the client.
5. Create the local structure: `Frontend`, `Backend`, and `Terraform`.
6. Copy `Test/Bootstrap` to `Terraform/Bootstrap`.
7. Copy `Test/App` to `Terraform/App`.
8. Copy `Test/.github` to `.github`.
9. Copy `Test/scripts` to `scripts`.
10. Copy `Test/gitignore.example` to `.gitignore`.
11. Run `npm create vite@latest` in `Frontend`.
12. Copy `Test/FrontendTemplate/*` into `Frontend`.
13. Add the `build:ssr` script from `FrontendTemplate/README.md` to `Frontend/package.json`.
14. Create the `.NET 10` backend Lambda project in `Backend`.
15. Fill in `Terraform/Bootstrap/bootstrap.tfvars`.
16. Run Bootstrap locally.
17. Copy and fill in App backend/tfvars files:
    - `Terraform/App/backends/staging.hcl`
    - `Terraform/App/backends/production.hcl`
    - `Terraform/App/environments/staging.tfvars`
    - `Terraform/App/environments/production.tfvars`
18. Run staging App Terraform plan locally, review it, then apply only after explicit approval.
19. Add Bootstrap role outputs to GitHub repository variables.
20. Run `Release Production` from GitHub with `plan`, then with `apply` when ready.

Avoid long-lived AWS access keys for GitHub Actions. The generated deploy roles
are intended for OIDC-based workflow authentication.

## GitHub Setup

Create these repository variables after Bootstrap finishes:

```text
AWS_REGION=us-east-2
AWS_GITHUB_ACTIONS_SITE_DEPLOY_ROLE_ARN=<github_actions_site_deploy_role_arn>
AWS_PRODUCTION_DEPLOY_ROLE_ARN=<production_app_deploy_role_arn>
STAGING_SITE_ORIGIN=<staging CloudFront URL or domain>
PRODUCTION_SITE_ORIGIN=<production CloudFront URL or domain>
```

`STAGING_SITE_ORIGIN` and `PRODUCTION_SITE_ORIGIN` are optional while using the
generated CloudFront domains. Set them later if an environment gets a custom
domain and generated sitemap/metadata should use that origin.

## Workflow Files

`deploy-staging.yml` deploys staging on every push to `main` and can also be run
manually from `main`.

`release-production.yml` is manual only and lets you choose `plan` or `apply`.
It first assumes the staging GitHub Actions role, then assumes the production
deploy role through `APP_DEPLOY_ROLE_ARN`.

`pr-checks.yml` runs the full repo validation matrix: shared tests/build,
backend tests/build, frontend typecheck/tests/SSR build, artifact packaging,
Terraform formatting, and Terraform validation. It does not apply Terraform.
