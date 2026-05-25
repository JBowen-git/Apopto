# Terraform Deployment Runbook

This runbook covers the current Bootstrap and App deployment flow. It is
documentation only; it does not add resources or change deploy behavior.

## Safety Rule

For infrastructure phases, stop after producing a Terraform plan unless the
operator explicitly approves apply.

```text
Plan first. Review the plan. Apply only after explicit approval.
```

CI validation must never run `terraform apply`.

## Terraform Roots

```text
Terraform/Bootstrap   Remote state, GitHub OIDC, deploy roles
Terraform/App         Website, API, portal data/storage, Lambdas, observability
```

Bootstrap should run first from an admin-capable AWS session. App is applied
once per environment using the matching backend config and tfvars file.

## Local Prerequisites

Use placeholders or local-only values for secrets. Do not commit real secrets.

```bash
node --version
dotnet --version
terraform version
aws sts get-caller-identity
```

Expected environment-specific files:

```text
Terraform/App/backends/staging.hcl
Terraform/App/backends/production.hcl
Terraform/App/environments/staging.tfvars
Terraform/App/environments/production.tfvars
```

The tracked `.example` files document required variables. The real `.tfvars`
files should stay untracked when they contain environment-specific values.

## Validation

Run the repo validation matrix before planning:

```bash
npm run validate:repo
```

For a faster deploy workflow that packages separately:

```bash
RUN_ARTIFACT_PACKAGE_VALIDATION=false npm run validate:repo
```

## Artifact Packaging

Terraform expects built site assets and Lambda zips before plan/apply:

```bash
APP_ENVIRONMENT=staging \
PRERENDER_SITE_ORIGIN=https://example.com \
bash scripts/cicd/package_release_artifacts.sh
```

The packaging script stages:

```text
Terraform/App/.artifacts/site
Terraform/App/.artifacts/site-renderer
Backend/artifacts/{env}-backend.zip
Backend/artifacts/{env}-portal-api.zip
Terraform/App/lambda_packages/site-renderer.zip
```

## Staging Plan

```bash
terraform -chdir=Terraform/App init \
  -backend-config=backends/staging.hcl

terraform -chdir=Terraform/App plan \
  -var-file=environments/staging.tfvars \
  -out=staging.tfplan
```

Review the plan carefully. Pay extra attention to:

- CloudFront distribution changes, especially `web_acl_id`.
- S3 bucket policies and CORS.
- DynamoDB table deletion protection or replacement.
- GuardDuty Malware Protection resources and EventBridge rules.
- Lambda IAM policies.
- Any `destroy` or `replace` action outside expected static asset churn.

Apply only after explicit approval:

```bash
terraform -chdir=Terraform/App apply staging.tfplan
```

## Production Plan

Production should normally use the GitHub `Release Production` workflow with
`terraform_action=plan` first. Apply only after the generated plan is reviewed.

Local production plan shape:

```bash
terraform -chdir=Terraform/App init -reconfigure \
  -backend-config=backends/production.hcl

terraform -chdir=Terraform/App plan \
  -var-file=environments/production.tfvars \
  -out=production.tfplan
```

## GitHub Actions

- PR checks run validation and artifact packaging, but no Terraform apply.
- Staging deploy validates, packages, then applies on pushes to `main`.
- Production release is manual and can run `plan` or `apply`.

If a phase changes infrastructure, prefer a targeted human-reviewed apply when
possible, then follow with a full deploy after the drift-sensitive resource has
settled.

## Flat-Rate CloudFront Caution

The current CloudFront distribution has flat-rate plan constraints. CloudFront
may reject updates that remove/replace the required Web ACL or use unsupported
origin request policy features. The App Terraform root currently avoids managing
the existing Web ACL association directly; review `security.md` and
`cloudfront-api-hardening.md` before changing CloudFront or WAF resources.
